import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type ExamSection = {
  key: string;
  title: string;
  minutes: number;
  questionNumbers?: number[];
};

type PaperQuestion = {
  id?: string;
  questionNumber?: number;
  question?: string;
  options?: Record<string, string>;
  section?: string;
  sectionName?: string;
  imageDataUrl?: string;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: unknown;
  correct_answer?: unknown;
  answer?: unknown;
  correctOption?: unknown;
  correct_option?: unknown;
  [key: string]: unknown;
};

type ExamMode = "full" | "sectional";

const ATTEMPT_FIELDS =
  "id, paper_id, mode, section_key, status, started_at, ends_at, active_section, section_deadline_at, current_index, answers, marked_questions, result";

const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
type OptionLetter = (typeof OPTION_LETTERS)[number];

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

/* -------------------------------------------------------
   SUPABASE SERVER CLIENT
------------------------------------------------------- */

async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL does not look like a valid Supabase project URL."
    );
  }

  if (key.startsWith("sb_secret_") || key.startsWith("service_role")) {
    throw new Error(
      "A Supabase secret/service-role key was configured as the public key. Use the publishable or anon key."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          console.error(
            "Unable to persist Supabase session cookies:",
            error
          );
        }
      },
    },
  });
}

/* -------------------------------------------------------
   SUPABASE ADMIN CLIENT
   Used only for private answer-key access.
------------------------------------------------------- */

async function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceKey) {
    throw new Error(
      "Private answer-key access is not configured. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to Vercel Environment Variables."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/* -------------------------------------------------------
   ANONYMOUS USER
------------------------------------------------------- */

async function getOrCreateAnonymousUser() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) {
    return { supabase, user };
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error || !data.user) {
    console.error("Anonymous Supabase authentication failed:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });

    if (
      error?.message?.toLowerCase().includes("invalid api key") ||
      error?.status === 401
    ) {
      throw new Error(
        "Supabase rejected the API key (401 Invalid API key). Check URL/key and restart Next.js."
      );
    }

    throw new Error(
      error?.message ||
        "Could not create a guest session. Enable Anonymous Sign-Ins in Supabase Authentication."
    );
  }

  return {
    supabase,
    user: data.user,
  };
}

/* -------------------------------------------------------
   ANSWER NORMALIZATION
------------------------------------------------------- */

function normalizeAnswer(value: unknown): OptionLetter | null {
  if (typeof value === "number") {
    value = String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/^OPTION\s*/, "")
    .replace(/^[([]/, "")
    .replace(/[)\].,]$/, "");

  if (OPTION_LETTERS.includes(normalized as OptionLetter)) {
    return normalized as OptionLetter;
  }

  const match = normalized.match(
    /(?:ANSWER\s*[:=-]\s*)?([A-E])\b/
  );

  return match ? (match[1] as OptionLetter) : null;
}

/* -------------------------------------------------------
   PARSE ANSWER KEY TEXT
   Supports:
   1-C
   1. C
   Q1: C
   S1. Ans.(E)
------------------------------------------------------- */

function parseAnswerKeyText(
  text: string
): Record<number, OptionLetter> {
  const result: Record<number, OptionLetter> = {};

  if (!text?.trim()) {
    return result;
  }

  const patterns = [
    /(?:Q\s*)?(\d+)\s*[-.:)]\s*(?:Ans\.?\s*\(?\s*)?(?:OPTION\s*)?([A-Ea-e])\b/gi,
    /S\s*(\d+)\s*\.?\s*Ans\.?\s*\(?\s*([A-Ea-e])\s*\)?/gi,
    /(?:Q\s*)?(\d+)\s*[→=]\s*([A-Ea-e])\b/gi,
  ];

  for (const regex of patterns) {
    let match: RegExpExecArray | null;

    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const n = Number(match[1]);
      const letter = match[2].toUpperCase() as OptionLetter;

      if (Number.isFinite(n) && OPTION_LETTERS.includes(letter)) {
        result[n] = letter;
      }
    }
  }

  return result;
}

/* -------------------------------------------------------
   RESOLVE QUESTION ANSWER
------------------------------------------------------- */

function resolveQuestionAnswer(
  question: PaperQuestion,
  index: number,
  keyFromText: Record<number, OptionLetter>
): OptionLetter | null {
  const qn = getQuestionNumber(question, index);

  return (
    normalizeAnswer(question.correctAnswer) ||
    normalizeAnswer(question.correct_answer) ||
    normalizeAnswer(question.answer) ||
    normalizeAnswer(question.correctOption) ||
    normalizeAnswer(question.correct_option) ||
    keyFromText[qn] ||
    null
  );
}

/* -------------------------------------------------------
   REMOVE ANSWERS FROM LIVE EXAM QUESTIONS
------------------------------------------------------- */

function sanitizeQuestion(question: PaperQuestion) {
  const {
    correctAnswer: _c1,
    correct_answer: _c2,
    answer: _a,
    correctOption: _o1,
    correct_option: _o2,
    explanation: _e,
    solution: _s,
    answer_key: _ak,
    ...safeQuestion
  } = question;

  return safeQuestion;
}

/* -------------------------------------------------------
   QUESTIONS FOR REVIEW
------------------------------------------------------- */

function questionForReview(
  question: PaperQuestion,
  index: number,
  keyFromText: Record<number, OptionLetter>
) {
  const safe = sanitizeQuestion(question);

  const correctAnswer = resolveQuestionAnswer(
    question,
    index,
    keyFromText
  );

  return {
    ...safe,
    correctAnswer,
  };
}

/* -------------------------------------------------------
   GET EXAM SECTIONS
------------------------------------------------------- */

function getSections(
  config: JsonObject,
  paper: {
    section: string | null;
    minutes: number | null;
    questions: PaperQuestion[];
    sections?: unknown;
  }
): ExamSection[] {
  const topSections = paper.sections;

  if (Array.isArray(topSections) && topSections.length > 0) {
    const mapped = topSections
      .map((section, idx) => {
        if (!section || typeof section !== "object") {
          return null;
        }

        const s = section as JsonObject;

        const title = String(
          s.name ?? s.title ?? `Section ${idx + 1}`
        );

        const key = String(
          s.key ?? title.toLowerCase().replace(/\s+/g, "-")
        );

        const minutes = Math.max(
          1,
          Number(s.minutes) || 20
        );

        const qs = Array.isArray(s.questions)
          ? s.questions
          : [];

        const questionNumbers = qs
          .map((q, i) =>
            typeof q === "object" && q
              ? Number((q as PaperQuestion).questionNumber) || i + 1
              : i + 1
          )
          .filter(Number.isFinite);

        return {
          key,
          title,
          minutes,
          questionNumbers:
            questionNumbers.length > 0
              ? questionNumbers
              : undefined,
        } as ExamSection;
      })
      .filter((s): s is ExamSection => Boolean(s));

    if (mapped.length) {
      return mapped;
    }
  }

  const configured = config.sections;

  if (Array.isArray(configured) && configured.length > 0) {
    const sections = configured
      .filter(
        (section): section is ExamSection =>
          typeof section === "object" &&
          section !== null &&
          typeof (section as ExamSection).key === "string" &&
          typeof (section as ExamSection).title === "string"
      )
      .map((section) => ({
        key: section.key,
        title: section.title,
        minutes: Math.max(1, Number(section.minutes) || 1),
        questionNumbers: Array.isArray(section.questionNumbers)
          ? section.questionNumbers
              .map(Number)
              .filter(Number.isFinite)
          : [],
      }));

    if (sections.length > 0) {
      return sections;
    }
  }

  // Infer sections from question.section / sectionName.

  const bySection = new Map<string, number[]>();

  paper.questions.forEach((q, index) => {
    const title = String(
      q.sectionName || q.section || paper.section || "General"
    );

    const list = bySection.get(title) || [];

    list.push(getQuestionNumber(q, index));

    bySection.set(title, list);
  });

  if (bySection.size > 1) {
    const totalMin = Math.max(
      1,
      Number(paper.minutes) || 60
    );

    const names = Array.from(bySection.keys());

    const per = Math.max(
      1,
      Math.floor(totalMin / names.length)
    );

    return names.map((title, idx) => ({
      key: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      minutes:
        idx === names.length - 1
          ? totalMin - per * (names.length - 1)
          : per,
      questionNumbers: bySection.get(title),
    }));
  }

  return [
    {
      key: "main",
      title: paper.section || "General",
      minutes: Math.max(1, Number(paper.minutes) || 1),
      questionNumbers: paper.questions.map((q, index) =>
        getQuestionNumber(q, index)
      ),
    },
  ];
}

/* -------------------------------------------------------
   QUESTION NUMBER
------------------------------------------------------- */

function getQuestionNumber(
  question: PaperQuestion,
  index: number
): number {
  return Number(question.questionNumber) || index + 1;
}

/* -------------------------------------------------------
   SELECT QUESTIONS
------------------------------------------------------- */

function selectQuestions(
  questions: PaperQuestion[],
  sections: ExamSection[],
  mode: ExamMode,
  sectionKey?: string
): PaperQuestion[] {
  if (mode === "full") {
    const configuredNumbers = sections.flatMap(
      (section) => section.questionNumbers || []
    );

    if (!configuredNumbers.length) {
      return questions;
    }

    const byNumber = new Map<number, PaperQuestion>();

    questions.forEach((question, index) => {
      byNumber.set(
        getQuestionNumber(question, index),
        question
      );
    });

    const ordered = sections.flatMap((section) =>
      (section.questionNumbers || [])
        .map((number) => byNumber.get(Number(number)))
        .filter(
          (question): question is PaperQuestion =>
            Boolean(question)
        )
    );

    return ordered.length ? ordered : questions;
  }

  const section = sections.find(
    (item) => item.key === sectionKey
  );

  if (!section) {
    throw new Error(
      "The selected exam section does not exist."
    );
  }

  if (section.questionNumbers?.length) {
    const allowed = new Set(
      section.questionNumbers.map(Number)
    );

    return questions.filter((question, index) =>
      allowed.has(getQuestionNumber(question, index))
    );
  }

  return questions.filter((question) => {
    const value = String(
      question.sectionName || question.section || ""
    ).toLowerCase();

    return (
      value === section.title.toLowerCase() ||
      value === section.key.toLowerCase()
    );
  });
}

/* -------------------------------------------------------
   EXAM DURATION
------------------------------------------------------- */

function durationForAttempt(
  sections: ExamSection[],
  mode: ExamMode,
  sectionKey?: string
) {
  if (mode === "sectional") {
    const section = sections.find(
      (item) => item.key === sectionKey
    );

    if (!section) {
      throw new Error(
        "The selected exam section does not exist."
      );
    }

    return section.minutes * 60;
  }

  return (
    sections.reduce(
      (sum, section) => sum + section.minutes,
      0
    ) * 60
  );
}

/* -------------------------------------------------------
   BUILD CORRECT ANSWERS MAP
------------------------------------------------------- */

function buildCorrectAnswersMap(
  questions: PaperQuestion[],
  answerKeyText: string
): Record<string, OptionLetter> {
  const fromText = parseAnswerKeyText(answerKeyText);

  const map: Record<string, OptionLetter> = {};

  questions.forEach((q, index) => {
    const n = getQuestionNumber(q, index);

    const letter = resolveQuestionAnswer(
      q,
      index,
      fromText
    );

    if (letter) {
      map[String(n)] = letter;
    }
  });

  return map;
}

/* -------------------------------------------------------
   ENRICH RESULT WITH ANSWERS
------------------------------------------------------- */

function enrichResultWithAnswers(
  result: unknown,
  questions: PaperQuestion[],
  answerKeyText: string
) {
  const correctAnswers = buildCorrectAnswersMap(
    questions,
    answerKeyText
  );

  const base =
    result && typeof result === "object"
      ? (result as JsonObject)
      : {};

  return {
    ...base,
    correctAnswers,

    questions: questions.map((q, index) => {
      const qn = getQuestionNumber(q, index);

      return {
        questionNumber: qn,
        correctAnswer: correctAnswers[String(qn)] ?? null,
        section: q.sectionName || q.section || null,
      };
    }),
  };
}

/* -------------------------------------------------------
   LOAD PUBLISHED PAPER
   Answer key is optional.
------------------------------------------------------- */

async function loadPublishedPaper(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  id: string,
  options: { includeAnswerKey?: boolean } = {}
) {
  // Load only columns that exist in your papers table.

  const { data: paper, error } = await supabase
    .from("papers")
    .select(
      "id, title, section, minutes, questions, is_published"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase paper query failed:", error);

    throw new Error(
      `Unable to load paper: ${error.message}`
    );
  }

  if (!paper) {
    throw new Error(
      "Paper not found. Verify the paper ID and database access policies."
    );
  }

  if (!paper.is_published) {
    throw new Error(
      "This paper is not published yet. Publish it from the admin panel first."
    );
  }

  const questions: PaperQuestion[] = Array.isArray(
    paper.questions
  )
    ? (paper.questions as PaperQuestion[])
    : [];

  if (questions.length === 0) {
    throw new Error(
      "This paper does not contain any questions."
    );
  }

  // Important:
  // Do not access the private answer-key table when starting
  // or displaying a live exam.

  let answerKeyText = "";

  if (options.includeAnswerKey) {
    const adminSupabase = await supabaseAdmin();

    const {
      data: answerKeyRow,
      error: answerKeyError,
    } = await adminSupabase
      .from("paper_answer_keys")
      .select("answer_key_text, answers")
      .eq("paper_id", id)
      .maybeSingle();

    if (answerKeyError) {
      console.error(
        "Private answer key query failed:",
        answerKeyError
      );

      throw new Error(
        `Unable to load the private answer key: ${answerKeyError.message}`
      );
    }

    const storedAnswers =
      answerKeyRow?.answers &&
      typeof answerKeyRow.answers === "object" &&
      !Array.isArray(answerKeyRow.answers)
        ? (answerKeyRow.answers as Record<string, unknown>)
        : {};

    const generatedAnswerKey = Object.entries(storedAnswers)
      .map(
        ([number, answer]) =>
          `${number}. ${String(answer)}`
      )
      .join("\n");

    answerKeyText =
      (typeof answerKeyRow?.answer_key_text === "string" &&
      answerKeyRow.answer_key_text.trim()
        ? answerKeyRow.answer_key_text
        : generatedAnswerKey) || "";
  }

  const config: JsonObject = {};

  const sections = getSections(config, {
    section: paper.section || null,
    minutes: paper.minutes || null,
    questions,
  });

  return {
    questions,
    sections,
    answerKeyText,
    paperRow: paper,

    safePaper: {
      id: paper.id,
      title: paper.title,
      section: paper.section,
      minutes: paper.minutes,
      examConfig: config,
      sections,
      is_sectional: sections.length > 1,
      questions: questions.map(sanitizeQuestion),
    },
  };
}

/* =======================================================
   GET EXAM
   GET /api/exams/[id]
   GET /api/exams/[id]?attemptId=UUID
   GET /api/exams/[id]?attemptId=UUID&review=1
======================================================= */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }> | { id: string };
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return jsonError("A paper ID is required.", 400);
    }

    const { supabase, user } =
      await getOrCreateAnonymousUser();

    let loaded = await loadPublishedPaper(supabase, id);

    const attemptId =
      request.nextUrl.searchParams.get("attemptId");

    const reviewFlag =
      request.nextUrl.searchParams.get("review") === "1";

    let attempt = null;
    let allowKeys = false;

    if (attemptId) {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select(ATTEMPT_FIELDS)
        .eq("id", attemptId)
        .eq("paper_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Attempt restore failed:", error);

        return jsonError(
          `Unable to restore attempt: ${error.message}`,
          500
        );
      }

      attempt = data;

      // Answer keys are available only after the attempt is closed.

      if (
        attempt &&
        (attempt.status === "submitted" ||
          attempt.status === "completed" ||
          attempt.status === "graded" ||
          attempt.result)
      ) {
        allowKeys = true;
      }
    }

    // Review mode must still belong to this user
    // and must be a completed attempt.

    if (reviewFlag && attemptId && allowKeys) {
      allowKeys = true;
    } else if (reviewFlag && !allowKeys) {
      allowKeys = false;
    }

    // Load private answer key only when allowed.

    if (allowKeys) {
      loaded = await loadPublishedPaper(supabase, id, {
        includeAnswerKey: true,
      });
    }

    const keyFromText = parseAnswerKeyText(
      loaded.answerKeyText
    );

    const paperPayload = allowKeys
      ? {
          ...loaded.safePaper,
          answer_key_text: loaded.answerKeyText,

          questions: loaded.questions.map((q, i) =>
            questionForReview(q, i, keyFromText)
          ),
        }
      : loaded.safePaper;

    const responseBody: JsonObject = {
      paper: paperPayload,
      attempt,
    };

    if (allowKeys && attempt?.result) {
      responseBody.result = enrichResultWithAnswers(
        attempt.result,
        loaded.questions,
        loaded.answerKeyText
      );
    }

    return NextResponse.json(responseBody, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Exam GET error:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not load exam.",
      500
    );
  }
}

/* =======================================================
   POST EXAM
   Actions: start | save | submit | result
======================================================= */

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }> | { id: string };
  }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return jsonError("A paper ID is required.", 400);
    }

    const { supabase, user } =
      await getOrCreateAnonymousUser();

    let body: JsonObject;

    try {
      body = (await request.json()) as JsonObject;
    } catch {
      return jsonError(
        "Request body must contain valid JSON.",
        400
      );
    }

    const action = String(body.action || "");

    /* ---------------------------------------------------
       START EXAM
    --------------------------------------------------- */

    if (action === "start") {
      const mode: ExamMode =
        body.mode === "sectional"
          ? "sectional"
          : "full";

      const sectionKey =
        typeof body.sectionKey === "string"
          ? body.sectionKey
          : undefined;

      // This does not require the service-role key.

      const loaded = await loadPublishedPaper(
        supabase,
        id
      );

      let selectedQuestions: PaperQuestion[];

      try {
        selectedQuestions = selectQuestions(
          loaded.questions,
          loaded.sections,
          mode,
          sectionKey
        );
      } catch (error) {
        return jsonError(
          error instanceof Error
            ? error.message
            : "Invalid exam section.",
          400
        );
      }

      if (!selectedQuestions.length) {
        return jsonError(
          "This exam has no questions in the selected mode. Check section question numbers.",
          400
        );
      }

      const durationSeconds = durationForAttempt(
        loaded.sections,
        mode,
        sectionKey
      );

      const start = new Date();

      const end = new Date(
        start.getTime() + durationSeconds * 1000
      );

      const activeSection =
        mode === "sectional"
          ? sectionKey
          : loaded.sections[0]?.key;

      const firstSection = loaded.sections.find(
        (section) => section.key === activeSection
      );

      const sectionDeadline = firstSection
        ? new Date(
            start.getTime() +
              firstSection.minutes * 60_000
          )
        : end;

      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .insert({
          user_id: user.id,
          paper_id: id,
          mode,
          section_key:
            mode === "sectional" ? sectionKey : null,
          status: "in_progress",
          started_at: start.toISOString(),
          ends_at: end.toISOString(),
          active_section: activeSection,
          section_deadline_at:
            sectionDeadline.toISOString(),
          current_index: 0,
          answers: {},
          marked_questions: [],
        })
        .select(ATTEMPT_FIELDS)
        .single();

      if (error) {
        console.error(
          "Could not create exam attempt:",
          error
        );

        return jsonError(
          `Could not start exam: ${error.message}`,
          500
        );
      }

      return NextResponse.json(
        {
          attempt,
          durationSeconds,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ---------------------------------------------------
       GET ATTEMPT ID
    --------------------------------------------------- */

    const attemptId =
      typeof body.attemptId === "string"
        ? body.attemptId
        : "";

    if (!attemptId) {
      return jsonError(
        "Attempt ID is required.",
        400
      );
    }

    const {
      data: attempt,
      error: attemptError,
    } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("paper_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (attemptError) {
      console.error(
        "Attempt lookup failed:",
        attemptError
      );

      return jsonError(
        `Could not retrieve exam attempt: ${attemptError.message}`,
        500
      );
    }

    if (!attempt) {
      return jsonError(
        "Attempt not found for this guest session. Start a new test.",
        404
      );
    }

    /* ---------------------------------------------------
       RESULT
    --------------------------------------------------- */

    if (action === "result") {
      if (
        attempt.status === "in_progress" &&
        !attempt.result
      ) {
        return jsonError(
          "Attempt is still in progress.",
          409
        );
      }

      const loaded = await loadPublishedPaper(
        supabase,
        id,
        {
          includeAnswerKey: true,
        }
      );

      const enriched = enrichResultWithAnswers(
        attempt.result || {},
        loaded.questions,
        loaded.answerKeyText
      );

      return NextResponse.json(
        {
          result: enriched,

          paper: {
            id: loaded.safePaper.id,
            title: loaded.safePaper.title,
            section: loaded.safePaper.section,
            minutes: loaded.safePaper.minutes,
            sections: loaded.safePaper.sections,
            answer_key_text: loaded.answerKeyText,

            questions: loaded.questions.map((q, i) =>
              questionForReview(
                q,
                i,
                parseAnswerKeyText(
                  loaded.answerKeyText
                )
              )
            ),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /* ---------------------------------------------------
       CHECK ATTEMPT STATUS
    --------------------------------------------------- */

    if (attempt.status !== "in_progress") {
      if (attempt.result) {
        const loaded = await loadPublishedPaper(
          supabase,
          id,
          {
            includeAnswerKey: true,
          }
        );

        return NextResponse.json({
          result: enrichResultWithAnswers(
            attempt.result,
            loaded.questions,
            loaded.answerKeyText
          ),
        });
      }

      return jsonError(
        "This attempt is already closed.",
        409
      );
    }

    const expired =
      Date.now() >= new Date(attempt.ends_at).getTime();

    /* ---------------------------------------------------
       SAVE EXAM PROGRESS
    --------------------------------------------------- */

    if (action === "save") {
      if (expired) {
        const { data: result, error } =
          await supabase.rpc(
            "grade_exam_attempt",
            {
              p_attempt_id: attemptId,
            }
          );

        if (error) {
          console.error(
            "Automatic grading failed:",
            error
          );

          return jsonError(
            `Could not submit expired test: ${error.message}`,
            500
          );
        }

        const loaded = await loadPublishedPaper(
          supabase,
          id,
          {
            includeAnswerKey: true,
          }
        );

        return NextResponse.json({
          submitted: true,

          result: enrichResultWithAnswers(
            result,
            loaded.questions,
            loaded.answerKeyText
          ),
        });
      }

      const answers =
        body.answers &&
        typeof body.answers === "object" &&
        !Array.isArray(body.answers)
          ? body.answers
          : {};

      const markedQuestions = Array.isArray(
        body.markedQuestions
      )
        ? body.markedQuestions
            .map(Number)
            .filter(
              (value) =>
                Number.isInteger(value) && value >= 1
            )
        : [];

      const currentIndex = Math.max(
        0,
        Math.floor(Number(body.currentIndex) || 0)
      );

      const { error: updateError } = await supabase
        .from("exam_attempts")
        .update({
          answers,
          marked_questions: markedQuestions,
          current_index: currentIndex,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptId)
        .eq("user_id", user.id)
        .eq("status", "in_progress");

      if (updateError) {
        console.error(
          "Saving exam progress failed:",
          updateError
        );

        return jsonError(
          `Could not save your answers: ${updateError.message}`,
          500
        );
      }

      return NextResponse.json({
        saved: true,
      });
    }

    /* ---------------------------------------------------
       SUBMIT EXAM
    --------------------------------------------------- */

    if (action === "submit") {
      const { data: result, error } =
        await supabase.rpc(
          "grade_exam_attempt",
          {
            p_attempt_id: attemptId,
          }
        );

      if (error) {
        console.error(
          "Exam grading failed:",
          error
        );

        return jsonError(
          `Could not grade your exam: ${error.message}`,
          500
        );
      }

      const loaded = await loadPublishedPaper(
        supabase,
        id,
        {
          includeAnswerKey: true,
        }
      );

      const enriched = enrichResultWithAnswers(
        result,
        loaded.questions,
        loaded.answerKeyText
      );

      return NextResponse.json(
        {
          result: enriched,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return jsonError(
      "Unsupported exam action.",
      400
    );
  } catch (error) {
    console.error("Exam POST error:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Exam request failed.",
      500
    );
  }
}
