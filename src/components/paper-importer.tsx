"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClipboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { formatInlineMath } from "@/lib/format-inline-math";

import {
  parsePaper,
  type ImportedQuestion,
  type OptionLetter,
} from "@/lib/question-importer";

type QuestionWithImage = ImportedQuestion & {
  imageDataUrl?: string;
};

type PaperRow = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: QuestionWithImage[] | null;
  paper_text: string | null;
  answer_key_text: string | null;
  is_published: boolean;
  created_by?: string | null;
  created_at?: string;
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function PaperImporter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [paper, setPaper] = useState("");
  const [keyText, setKeyText] = useState("");
  const [section, setSection] = useState("Quantitative Aptitude");
  const [minutes, setMinutes] = useState(20);
  const [title, setTitle] = useState("IBPS Practice Mock");

  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [unmatched, setUnmatched] = useState<number[]>([]);

  // This is the Supabase papers.id, not a localStorage ID.
  const [savedId, setSavedId] = useState<string | null>(null);

  const [saveNotice, setSaveNotice] = useState("");
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingTest, setStartingTest] = useState(false);

  const parsedResult = useMemo(
    () => parsePaper(paper, keyText, section),
    [paper, keyText, section]
  );

  /**
   * Load an existing paper directly from Supabase when the URL contains ?id=...
   * Admin edit links should point to this page with a valid papers.id.
   */
  const loadPaper = useCallback(async () => {
    const requestedId = searchParams.get("id");

    if (!requestedId) return;

    setLoadingPaper(true);
    setSaveNotice("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setSaveNotice("Please sign in before loading a saved paper.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setSaveNotice("Only an administrator can edit imported papers.");
        return;
      }

      const { data, error } = await supabase
        .from("papers")
        .select(
          "id, title, section, minutes, questions, paper_text, answer_key_text, is_published, created_by"
        )
        .eq("id", requestedId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSaveNotice("This paper could not be found in Supabase.");
        return;
      }

      const selected = data as PaperRow;

      setTitle(selected.title ?? "");
      setSection(selected.section ?? "Quantitative Aptitude");
      setMinutes(
        Math.min(180, Math.max(1, Number(selected.minutes) || 20))
      );
      setPaper(selected.paper_text ?? "");
      setKeyText(selected.answer_key_text ?? "");
      setSavedId(selected.id);

      /*
       * Prefer the stored question JSON so attached images and manually
       * reviewed question data are preserved. Re-parse only if no questions
       * were stored.
       */
      if (
        Array.isArray(selected.questions) &&
        selected.questions.length > 0
      ) {
        setQuestions(selected.questions);
        setErrors([]);
        setUnmatched([]);
      } else {
        const reparsed = parsePaper(
          selected.paper_text ?? "",
          selected.answer_key_text ?? "",
          selected.section ?? "Quantitative Aptitude"
        );

        setQuestions(reparsed.questions);
        setErrors(reparsed.errors);
        setUnmatched(reparsed.unmatchedAnswerNumbers);
      }

      setSaveNotice("Paper loaded from Supabase.");
    } catch (error) {
      setSaveNotice(`Could not load paper: ${getErrorMessage(error)}`);
    } finally {
      setLoadingPaper(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadPaper();
  }, [loadPaper]);

  /**
   * Convert an image into a smaller JPEG data URL.
   * This keeps the existing image attachment workflow.
   *
   * For a large production paper collection, Supabase Storage is preferable
   * to storing image data URLs inside the questions JSON.
   */
  async function imageFileToDataUrl(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file.");
    }

    const original = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error("Could not read image."));

        reader.onload = () => {
          const image = new Image();

          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Could not open image."));
          image.src = String(reader.result);
        };

        reader.readAsDataURL(file);
      }
    );

    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / original.width);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(original.width * scale));
    canvas.height = Math.max(1, Math.round(original.height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not process this image.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(original, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function attachImageToQuestion(
    questionNumber: number,
    file?: File
  ) {
    if (!file) return;

    try {
      const imageDataUrl = await imageFileToDataUrl(file);

      setQuestions((previous) =>
        previous.map((question) =>
          question.questionNumber === questionNumber
            ? { ...question, imageDataUrl }
            : question
        )
      );

      setSaveNotice(
        `Image attached to Q${questionNumber}. Save the paper to persist the change.`
      );
    } catch (error) {
      setSaveNotice(getErrorMessage(error));
    }
  }

  function handleQuestionImagePaste(
    event: ClipboardEvent<HTMLElement>,
    questionNumber: number
  ) {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );

    const file = imageItem?.getAsFile();

    if (file) {
      event.preventDefault();
      void attachImageToQuestion(questionNumber, file);
    }
  }

  function removeQuestionImage(questionNumber: number) {
    setQuestions((previous) =>
      previous.map((question) => {
        if (question.questionNumber !== questionNumber) {
          return question;
        }

        const updatedQuestion = { ...question };
        delete updatedQuestion.imageDataUrl;

        return updatedQuestion;
      })
    );

    setSaveNotice(
      `Image removed from Q${questionNumber}. Save the paper to persist the change.`
    );
  }

  function generatePreview() {
    const result = parsePaper(paper, keyText, section);

    setQuestions(result.questions);
    setErrors(result.errors);
    setUnmatched(result.unmatchedAnswerNumbers);

    setSaveNotice(
      result.questions.length
        ? `Preview generated: ${result.questions.length} questions found.`
        : "No questions were detected. Check the paper format and try again."
    );
  }

  /**
   * Save directly to Supabase.
   *
   * Existing paper: UPDATE using its Supabase ID.
   * New paper: INSERT and obtain the generated ID from Supabase.
   *
   * New papers are drafts. Publishing is handled by the admin papers page.
   */
  async function savePaperToSupabase(): Promise<string | null> {
    if (!questions.length) {
      setSaveNotice("Parse the paper and review the questions before saving.");
      return null;
    }

    if (saving) return null;

    setSaving(true);
    setSaveNotice("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setSaveNotice("Please sign in before saving a paper.");
        router.push("/admin/login");
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setSaveNotice("Only administrators can save papers to the repository.");
        return null;
      }

      const normalizedTitle = title.trim();

      if (!normalizedTitle) {
        setSaveNotice("Enter a title for this paper.");
        return null;
      }

      const payload = {
        title: normalizedTitle,
        section,
        minutes: Math.min(180, Math.max(1, Number(minutes) || 1)),
        questions,
        paper_text: paper,
        answer_key_text: keyText,
        updated_at: new Date().toISOString(),
      };

      if (savedId) {
        // Update the existing Supabase record.
        const { data, error } = await supabase
          .from("papers")
          .update(payload)
          .eq("id", savedId)
          .select("id")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "The paper was not updated. Check that it still exists and that your admin permissions allow editing."
          );
        }

        setSavedId(data.id);
        setSaveNotice("Paper updated successfully in Supabase.");

        return data.id;
      }

      // Insert a new record directly into Supabase as an unpublished draft.
      const { data, error } = await supabase
        .from("papers")
        .insert({
          ...payload,
          is_published: false,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      setSavedId(data.id);
      setSaveNotice("New paper saved to Supabase as a draft.");

      // Keep the URL aligned with the newly created Supabase record.
      router.replace(`/importer?id=${encodeURIComponent(data.id)}`);

      return data.id;
    } catch (error) {
      setSaveNotice(`Could not save paper: ${getErrorMessage(error)}`);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await savePaperToSupabase();
  }

  async function handleStartTest() {
    if (!questions.length) {
      setSaveNotice("Generate the preview before starting the test.");
      return;
    }

    if (startingTest) return;

    setStartingTest(true);

    try {
      const id = await savePaperToSupabase();

      if (!id) return;

      router.push(`/exam/${encodeURIComponent(id)}`);
    } finally {
      setStartingTest(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/papers"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← Admin papers
          </Link>

          <span className="text-xs text-slate-400">
            {savedId
              ? `Supabase ID: ${savedId}`
              : "New paper · Supabase repository"}
          </span>
        </div>

        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Create mock
          </p>

          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            Import question paper
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Paste the questions and answer key. Review the parsed questions,
            then save the paper directly to Supabase.
          </p>
        </header>

        {loadingPaper && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Loading paper from Supabase...
          </div>
        )}

        {saveNotice && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            {saveNotice}
          </div>
        )}

        {/* Paper settings and input */}
        <section className="space-y-6 rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Title
              </span>

              <input
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="IBPS Clerk Quantitative Aptitude"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Section
              </span>

              <select
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              >
                <option>Quantitative Aptitude</option>
                <option>Reasoning Ability</option>
                <option>English Language</option>
                <option>General Awareness</option>
                <option>Computer Knowledge</option>
                <option>Mixed Mock Test</option>
              </select>
            </label>
          </div>

          {/* Questions */}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Question paper
            </span>

            <textarea
              className="min-h-52 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-mono text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              value={paper}
              onChange={(event) => setPaper(event.target.value)}
              placeholder={`1. If 20% of a number is 80, what is the number?
(a) 200
(b) 300
(c) 400
(d) 500
(e) 600

2. What is 25% of 240?
(a) 40
(b) 50
(c) 60
(d) 70
(e) 80`}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setPaper((previous) =>
                      previous ? `${previous}\n\n${text}` : text
                    );
                  } catch {
                    alert(
                      "Clipboard access blocked. Click the box and press Ctrl+V."
                    );
                  }
                }}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Paste
              </button>

              <button
                type="button"
                onClick={() => setPaper("")}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </label>

          {/* Answer key */}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Answer key
            </span>

            <textarea
              className="min-h-24 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-mono text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              value={keyText}
              onChange={(event) => setKeyText(event.target.value)}
              placeholder={"1-C\n2-C\n3-A"}
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setKeyText((previous) =>
                      previous ? `${previous}\n${text}` : text
                    );
                  } catch {
                    alert(
                      "Clipboard access blocked. Click the box and press Ctrl+V."
                    );
                  }
                }}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Paste
              </button>

              <button
                type="button"
                onClick={() => setKeyText("")}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>

              <span className="text-xs text-slate-400">
                Formats: 1-C, 2: A, 3 = D
              </span>
            </div>
          </label>

          {/* Duration and parsing */}
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Duration (minutes)
              </span>

              <input
                type="number"
                min={1}
                max={180}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                value={minutes}
                onChange={(event) =>
                  setMinutes(
                    Math.min(
                      180,
                      Math.max(1, Number(event.target.value) || 1)
                    )
                  )
                }
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={generatePreview}
                disabled={!paper.trim()}
                className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                Parse &amp; review
              </button>
            </div>
          </div>
        </section>

        {/* Review section */}
        {questions.length > 0 && (
          <section className="mt-8 space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Review questions
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {questions.length} questions ·{" "}
                  {
                    questions.filter((question) => question.correctAnswer)
                      .length
                  }{" "}
                  answers matched
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || startingTest}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : savedId
                      ? "Update in Supabase"
                      : "Save to Supabase"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleStartTest()}
                  disabled={saving || startingTest}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {startingTest ? "Preparing test..." : "Save & Start Test"}
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Warnings</p>

                <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                  {errors.map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {unmatched.length > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Answer-key entries without matching questions:{" "}
                {unmatched.join(", ")}
              </p>
            )}

            <div className="space-y-3">
              {questions.map((question) => (
                <article
                  key={question.id}
                  className="rounded-xl border border-slate-200/80 bg-white p-5"
                  onPaste={(event) =>
                    handleQuestionImagePaste(
                      event,
                      question.questionNumber
                    )
                  }
                >
                  <p className="text-[15px] font-medium leading-relaxed">
                    <span className="text-slate-400">
                      Q{question.questionNumber}.
                    </span>{" "}
                    {formatInlineMath(question.question)}
                  </p>

                  {/* Image controls */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5">
                    <label className="cursor-pointer rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                      {question.imageDataUrl ? "Replace image" : "Add image"}

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          void attachImageToQuestion(
                            question.questionNumber,
                            event.target.files?.[0]
                          );

                          event.currentTarget.value = "";
                        }}
                      />
                    </label>

                    <span className="text-xs text-slate-400">
                      or paste (Ctrl+V)
                    </span>

                    {question.imageDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          removeQuestionImage(question.questionNumber)
                        }
                        className="ml-auto text-xs font-medium text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {question.imageDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={question.imageDataUrl}
                      alt={`Diagram for Q${question.questionNumber}`}
                      loading="lazy"
                      className="mt-3 max-h-80 max-w-full rounded-lg border border-slate-200 object-contain"
                    />
                  )}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {LETTERS.filter((letter) => question.options[letter]).map(
                      (letter) => (
                        <div
                          key={letter}
                          className={`rounded-lg border px-3 py-2.5 text-sm ${
                            question.correctAnswer === letter
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-100 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span className="font-medium">({letter})</span>{" "}
                          {formatInlineMath(question.options[letter] || "")}
                        </div>
                      )
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {question.correctAnswer
                      ? `Key: ${question.correctAnswer}`
                      : "No matching answer — verify before scoring"}
                  </p>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || startingTest}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Supabase"}
              </button>

              <button
                type="button"
                onClick={() => void handleStartTest()}
                disabled={saving || startingTest}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {startingTest ? "Preparing test..." : "Save & Start Test"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}