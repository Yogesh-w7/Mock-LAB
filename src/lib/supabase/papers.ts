
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

// Verify that the current user is an administrator.
async function requireAdmin(
  supabase: ReturnType<typeof createClient>
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in as an administrator.");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError) {
    throw new Error(
      `Could not verify administrator access: ${profileError.message}`
    );
  }

  if (profile?.role !== "admin") {
    throw new Error("Administrator access required.");
  }

  return user;
}

// Get all published papers.
export async function listPublishedPapers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("papers")
    .select(
      "id,title,section,minutes,questions,is_published,created_at,updated_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Could not load published papers: ${error.message}`
    );
  }

  return (data ?? []) as PaperRow[];
}

// Get all papers for administrators.
export async function listAdminPapers() {
  const supabase = createClient();

  await requireAdmin(supabase);

  const { data, error } = await supabase
    .from("papers")
    .select(
      "id,title,section,minutes,questions,is_published,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Could not load admin papers: ${error.message}`
    );
  }

  return (data ?? []) as PaperRow[];
}

// Save a new paper or update an existing paper.
export async function savePaper(input: SavePaperInput) {
  const supabase = createClient();

  const user = await requireAdmin(supabase);

  // Validate title.
  if (!input.title.trim()) {
    throw new Error("Enter a title for the paper.");
  }

  // Validate questions.
  if (!input.questions.length) {
    throw new Error("Import at least one question.");
  }

  // Keep correct answers out of public questions.
  const publicQuestions: PublicQuestion[] =
    input.questions.map((q) => ({
      id: String(q.id),
      questionNumber: q.questionNumber,
      question: q.question,
      options: q.options,
    }));

  // Use the original answer-key text when available.
  // Otherwise, generate it from matched question answers.
  const generatedAnswerKey = input.questions
    .flatMap((q) => {
      const answer = q.correctAnswer;

      if (
        typeof answer !== "string" ||
        answer.trim().length === 0
      ) {
        return [];
      }

      return [
        `${q.questionNumber}. ${answer.trim()}`
      ];
    })
    .join("\n");

  const effectiveAnswerKeyText =
    input.answerKeyText?.trim() || generatedAnswerKey;

  // Do not save a paper without a usable answer key.
  if (!effectiveAnswerKeyText.trim()) {
    throw new Error(
      "No correct answers found. Import the answer key and verify the question-answer matching before saving."
    );
  }

  // Prepare public paper data.
  const paperPayload = {
    title: input.title.trim(),
    section: input.section,
    minutes: Math.min(
      180,
      Math.max(1, Number(input.minutes) || 1)
    ),
    questions: publicQuestions,
    is_published: Boolean(input.publish),
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  let paperId = input.id ?? null;

  // Update existing paper.
  if (paperId) {
    const { data, error } = await supabase
      .from("papers")
      .update(paperPayload)
      .eq("id", paperId)
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Could not update paper: ${error.message}`
      );
    }

    paperId = data.id;
  } else {
    // Insert new paper.
    const { data, error } = await supabase
      .from("papers")
      .insert(paperPayload)
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Could not create paper: ${error.message}`
      );
    }

    paperId = data.id;
  }

  // Save the private answer key separately.
  // Do not include the nonexistent "answers" column.
  const { error: answerError } = await supabase
    .from("paper_answer_keys")
    .upsert(
      {
        paper_id: paperId,
        paper_text: input.paperText ?? "",
        answer_key_text: effectiveAnswerKeyText,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "paper_id",
      }
    );

  if (answerError) {
    console.error(
      "Private answer key save failed:",
      answerError
    );

    throw new Error(
      `Paper metadata saved, but saving the private answer key failed: ${answerError.message}`
    );
  }

  return paperId;
}

// Delete a paper.
export async function deletePaper(paperId: string) {
  const supabase = createClient();

  await requireAdmin(supabase);

  const { error } = await supabase
    .from("papers")
    .delete()
    .eq("id", paperId);

  if (error) {
    throw new Error(
      `Could not delete paper: ${error.message}`
    );
  }
}
