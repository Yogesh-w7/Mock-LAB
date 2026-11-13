-- ============================================================
-- BankPrep: configurable exam engine
-- Existing tables expected: public.papers, public.profiles
-- Existing helper expected: public.is_admin()
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Extend existing papers table.
alter table public.papers
  add column if not exists exam_config jsonb
  not null default '{}'::jsonb;

-- 2. Private answer keys.
create table if not exists public.paper_answer_keys (
  paper_id uuid primary key
    references public.papers(id) on delete cascade,
  answer_key jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.paper_answer_keys enable row level security;

drop policy if exists "Admins manage answer keys"
  on public.paper_answer_keys;

create policy "Admins manage answer keys"
on public.paper_answer_keys
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3. Migrate correctAnswer values out of existing question JSON.
-- Supports the existing ImportedQuestion shape:
-- { questionNumber, question, options, correctAnswer, ... }
do $$
declare
  p record;
  q jsonb;
  key_json jsonb;
  safe_questions jsonb;
  q_number text;
  answer text;
begin
  for p in
    select id, questions
    from public.papers
    where jsonb_typeof(questions) = 'array'
  loop
    key_json := '{}'::jsonb;
    safe_questions := '[]'::jsonb;

    for q in
      select value
      from jsonb_array_elements(p.questions)
    loop
      q_number := coalesce(
        q ->> 'questionNumber',
        q ->> 'id'
      );

      answer := q ->> 'correctAnswer';

      if q_number is not null
         and answer is not null
         and lower(answer) not in ('null', '') then
        key_json := key_json ||
          jsonb_build_object(q_number, answer);
      end if;

      safe_questions := safe_questions ||
        jsonb_build_array(q - 'correctAnswer');
    end loop;

    if key_json <> '{}'::jsonb then
      insert into public.paper_answer_keys (
        paper_id,
        answer_key,
        updated_at
      )
      values (
        p.id,
        key_json,
        now()
      )
      on conflict (paper_id)
      do update set
        answer_key = public.paper_answer_keys.answer_key
          || excluded.answer_key,
        updated_at = now();
    end if;

    update public.papers
    set questions = safe_questions
    where id = p.id;
  end loop;
end $$;

-- 4. Give each attempt a server-controlled lifecycle.
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete restrict,

  mode text not null check (mode in ('full', 'sectional')),
  section_key text,

  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),

  started_at timestamptz not null default now(),
  ends_at timestamptz not null,

  active_section text,
  section_deadline_at timestamptz,
  current_index integer not null default 0,

  answers jsonb not null default '{}'::jsonb,
  marked_questions jsonb not null default '[]'::jsonb,

  score numeric(10, 2),
  correct_count integer,
  wrong_count integer,
  unanswered_count integer,
  attempted_count integer,
  accuracy numeric(5, 2),
  result jsonb,

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_created_idx
  on public.exam_attempts(user_id, created_at desc);

create index if not exists exam_attempts_paper_idx
  on public.exam_attempts(paper_id);

alter table public.exam_attempts enable row level security;

drop policy if exists "Users read own attempts"
  on public.exam_attempts;

create policy "Users read own attempts"
on public.exam_attempts
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users create own attempts"
  on public.exam_attempts;

create policy "Users create own attempts"
on public.exam_attempts
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users update own attempts"
  on public.exam_attempts;

create policy "Users update own attempts"
on public.exam_attempts
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 5. Students may read published papers.
-- Keep your existing admin policies if they are already correct.
drop policy if exists "Read published papers"
  on public.papers;

create policy "Read published papers"
on public.papers
for select
to anon, authenticated
using (
  is_published = true
  or (
    (select auth.uid()) is not null
    and public.is_admin()
  )
);

-- 6. Server-side grading.
-- Correct answers are read inside this SECURITY DEFINER function,
-- never returned to the browser.
create or replace function public.grade_exam_attempt(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.exam_attempts%rowtype;
  v_paper public.papers%rowtype;
  v_keys jsonb;
  v_answers jsonb;
  v_questions jsonb;
  v_question jsonb;
  v_q_number text;
  v_given text;
  v_correct_answer text;
  v_marks numeric;
  v_negative numeric;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_unanswered integer := 0;
  v_attempted integer := 0;
  v_score numeric := 0;
  v_accuracy numeric := 0;
  v_total integer := 0;
  v_result jsonb;
begin
  select *
  into v_attempt
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Attempt not found or access denied';
  end if;

  -- Idempotent submission: return the saved result.
  if v_attempt.status <> 'in_progress' then
    if v_attempt.result is not null then
      return v_attempt.result;
    end if;

    raise exception 'Attempt is no longer in progress';
  end if;

  select *
  into v_paper
  from public.papers
  where id = v_attempt.paper_id;

  if not found then
    raise exception 'Paper not found';
  end if;

  select answer_key
  into v_keys
  from public.paper_answer_keys
  where paper_id = v_attempt.paper_id;

  if v_keys is null then
    raise exception 'Answer key has not been configured for this paper';
  end if;

  v_questions := v_paper.questions;
  v_answers := v_attempt.answers;

  for v_question in
    select value from jsonb_array_elements(v_questions)
  loop
    v_total := v_total + 1;

    v_q_number := coalesce(
      v_question ->> 'questionNumber',
      v_question ->> 'id'
    );

    v_given := v_answers ->> v_q_number;
    v_correct_answer := v_keys ->> v_q_number;

    if v_given is null or v_given = '' then
      v_unanswered := v_unanswered + 1;
      continue;
    end if;

    v_attempted := v_attempted + 1;

    v_marks := coalesce(
      nullif(v_question ->> 'marks', '')::numeric,
      nullif(v_paper.exam_config ->> 'marksPerQuestion', '')::numeric,
      1
    );

    v_negative := coalesce(
      nullif(v_question ->> 'negativeMarks', '')::numeric,
      nullif(v_paper.exam_config ->> 'negativeMarks', '')::numeric,
      0.25
    );

    if v_correct_answer is null then
      raise exception 'Missing answer key for question %', v_q_number;
    elsif upper(v_given) = upper(v_correct_answer) then
      v_correct := v_correct + 1;
      v_score := v_score + v_marks;
    else
      v_wrong := v_wrong + 1;
      v_score := v_score - v_negative;
    end if;
  end loop;

  if v_correct + v_wrong > 0 then
    v_accuracy := round(
      (v_correct::numeric / (v_correct + v_wrong)) * 100,
      2
    );
  end if;

  v_result := jsonb_build_object(
    'attemptId', v_attempt.id,
    'paperId', v_attempt.paper_id,
    'title', v_paper.title,
    'section', coalesce(v_attempt.section_key, v_paper.section),
    'mode', v_attempt.mode,
    'score', round(v_score, 2),
    'correct', v_correct,
    'wrong', v_wrong,
    'unanswered', v_unanswered,
    'attempted', v_attempted,
    'total', v_total,
    'accuracy', v_accuracy,
    'answers', v_answers,
    'marked', v_attempt.marked_questions,
    'date', extract(epoch from now()) * 1000
  );

  update public.exam_attempts
  set
    status = case
      when now() >= ends_at then 'expired'
      else 'submitted'
    end,
    score = round(v_score, 2),
    correct_count = v_correct,
    wrong_count = v_wrong,
    unanswered_count = v_unanswered,
    attempted_count = v_attempted,
    accuracy = v_accuracy,
    result = v_result,
    submitted_at = now(),
    updated_at = now()
  where id = v_attempt.id;

  return v_result;
end;
$$;

revoke all on function public.grade_exam_attempt(uuid) from public;
grant execute on function public.grade_exam_attempt(uuid) to authenticated;

-- Only the authenticated user's attempt can be graded by this function.
-- Never grant direct student SELECT access to paper_answer_keys.