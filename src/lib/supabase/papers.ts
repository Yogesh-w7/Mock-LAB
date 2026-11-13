
import { createClient } from "@/lib/supabase/client";
import type { ImportedQuestion } from "@/lib/question-importer";

export type PublicQuestion = {
  id: string;
  questionNumber: number;
  question: string;
  options: Record<string, string>;
};

export type PaperRow = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: PublicQuestion[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type SavePaperInput = {
  id?: string | null;
  title: string;
  section: string;
  minutes: number;
  questions: ImportedQuestion[];
  paperText: string;
  answerKeyText: string;
  publish?: boolean;
};

export async function listPublishedPapers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("papers")
    .select(
      "id,title,section,minutes,questions,is_published,created_at,updated_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaperRow[];
}

export async function listAdminPapers() {
  const supabase = createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Please sign in as an administrator.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Administrator access required.");
  }

  const { data, error } = await supabase
    .from("papers")
    .select(
      "id,title,section,minutes,questions,is_published,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PaperRow[];
}

export async function savePaper(input: SavePaperInput) {
  const supabase = createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Sign in before saving a paper.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Only administrators can save papers.");
  }

  if (!input.title.trim()) {
    throw new Error("Enter a title for the paper.");
  }

  if (!input.questions.length) {
    throw new Error("Import at least one question.");
  }

  // Never place correctAnswer in the publicly readable questions JSON.
  const publicQuestions: PublicQuestion[] = input.questions.map((q) => ({
    id: String(q.id),
    questionNumber: q.questionNumber,
    question: q.question,
    options: q.options,
  }));

  const answers: Record<string, string> = {};

  for (const q of input.questions) {
    if (q.correctAnswer) {
      answers[String(q.questionNumber)] = q.correctAnswer;
    }
  }

  const paperPayload = {
    title: input.title.trim(),
    section: input.section,
    minutes: Math.min(180, Math.max(1, input.minutes)),
    questions: publicQuestions,
    is_published: Boolean(input.publish),
    created_by: authData.user.id,
    updated_at: new Date().toISOString(),
  };

  let paperId = input.id ?? null;

  if (paperId) {
    const { data, error } = await supabase
      .from("papers")
      .update(paperPayload)
      .eq("id", paperId)
      .select("id")
      .single();

    if (error) throw error;
    paperId = data.id;
  } else {
    const { data, error } = await supabase
      .from("papers")
      .insert(paperPayload)
      .select("id")
      .single();

    if (error) throw error;
    paperId = data.id;
  }

  const { error: answerError } = await supabase
    .from("paper_answer_keys")
    .upsert(
      {
        paper_id: paperId,
        paper_text: input.paperText,
        answer_key_text: input.answerKeyText,
        answers,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paper_id" }
    );

  if (answerError) {
    throw new Error(
      `Paper metadata saved, but saving the private answer key failed: ${answerError.message}`
    );
  }

  return paperId;
}

export async function deletePaper(paperId: string) {
  const supabase = createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Please sign in as an administrator.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Only administrators can delete papers.");
  }

  const { error } = await supabase
    .from("papers")
    .delete()
    .eq("id", paperId);

  if (error) throw error;
}
