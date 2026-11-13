"use client";

import { useEffect, useState, type ClipboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parsePaper, type ImportedQuestion, type OptionLetter } from "@/lib/question-importer";
import { formatInlineMath } from "@/lib/format-inline-math";

type EditableQuestion = ImportedQuestion & {
  imageDataUrl?: string;
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];

// --- Inline SVGs & Micro-Icons ---
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function IconImage({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconTrash({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconEdit({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function IconClose({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconPlus({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

type SingleOptionEditState = {
  questionNumber: number;
  letter: OptionLetter;
  text: string;
} | null;

export default function AdminEditPaperPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState("");
  const [section, setSection] = useState("Quantitative Aptitude");
  const [minutes, setMinutes] = useState(20);
  const [paper, setPaper] = useState("");
  const [keyText, setKeyText] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const [editableQuestions, setEditableQuestions] = useState<EditableQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "review">("edit");

  // Full question modal editor
  const [editingQuestion, setEditingQuestion] = useState<EditableQuestion | null>(null);

  // Quick single-option editor
  const [editingOption, setEditingOption] = useState<SingleOptionEditState>(null);

  useEffect(() => {
    async function loadPaper() {
      if (!paperId) return;
      try {
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from("papers")
          .select("*")
          .eq("id", paperId)
          .single();

        if (fetchErr) throw fetchErr;
        if (data) {
          setTitle(data.title || "");
          setSection(data.section || "Quantitative Aptitude");
          setMinutes(data.minutes || 20);
          setPaper(data.paper_text || "");
          setKeyText(data.answer_key_text || "");
          setIsPublished(Boolean(data.is_published));

          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setEditableQuestions(data.questions as EditableQuestion[]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load paper.");
      } finally {
        setLoading(false);
      }
    }
    void loadPaper();
  }, [paperId]);

  function handleReparse() {
    if (!paper.trim()) {
      setError("Paper text cannot be empty.");
      return;
    }
    try {
      const result = parsePaper(paper, keyText, section);
      const existingImages = new Map(editableQuestions.map((q) => [q.questionNumber, q.imageDataUrl]));

      const merged: EditableQuestion[] = result.questions.map((q) => ({
        ...q,
        imageDataUrl: existingImages.get(q.questionNumber),
      }));

      setEditableQuestions(merged);
      setActiveTab("review");
      setSuccess(`Re-parsed ${merged.length} questions successfully!`);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-parse.");
    }
  }

  // --- Image Handling Helpers ---
  async function imageFileToDataUrl(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file (PNG, JPG, WebP).");
    }

    const original = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Could not load image."));
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

    const scale = Math.min(1, 1400 / original.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(original.width * scale));
    canvas.height = Math.max(1, Math.round(original.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(original, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function handleAttachImage(questionNumber: number, file?: File) {
    if (!file) return;
    try {
      const dataUrl = await imageFileToDataUrl(file);
      setEditableQuestions((prev) =>
        prev.map((q) => (q.questionNumber === questionNumber ? { ...q, imageDataUrl: dataUrl } : q))
      );
      setSuccess(`Attached diagram to Q${questionNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach image.");
    }
  }

  function handlePasteImage(e: ClipboardEvent<HTMLElement>, questionNumber: number) {
    const item = Array.from(e.clipboardData.items).find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void handleAttachImage(questionNumber, file);
    }
  }

  function handleRemoveImage(questionNumber: number) {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== questionNumber) return q;
        const { imageDataUrl: _, ...rest } = q;
        return rest;
      })
    );
  }

  // --- Option Modification Helpers ---
  function handleSaveSingleOption(qNum: number, letter: OptionLetter, newText: string) {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        return {
          ...q,
          options: {
            ...q.options,
            [letter]: newText.trim(),
          },
        };
      })
    );
    setEditingOption(null);
  }

  function handleDeleteOption(qNum: number, letter: OptionLetter) {
    setEditableQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        const updatedOptions = { ...q.options };
        delete updatedOptions[letter];
        return {
          ...q,
          options: updatedOptions,
          correctAnswer: q.correctAnswer === letter ? null : q.correctAnswer,
        };
      })
    );
  }

  function handleSaveFullQuestion(updated: EditableQuestion) {
    setEditableQuestions((prev) =>
      prev.map((q) => (q.questionNumber === updated.questionNumber ? updated : q))
    );
    setEditingQuestion(null);
  }

  async function handleUpdate(publish: boolean) {
    if (!editableQuestions.length) {
      setError("Cannot save: No questions available. Click 'Re-parse Questions' or check raw text.");
      return;
    }

    setSavingMode(publish ? "publish" : "draft");
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("papers")
        .update({
          title: title.trim() || "Untitled Mock",
          section,
          minutes: Math.max(1, minutes),
          questions: editableQuestions,
          paper_text: paper,
          answer_key_text: keyText,
          is_published: publish,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paperId);

      if (updateError) throw updateError;

      setIsPublished(publish);
      setSuccess(publish ? "Paper published successfully!" : "Draft updated successfully!");
      setTimeout(() => {
        router.push("/admin/papers");
        router.refresh();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update paper.");
    } finally {
      setSavingMode(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <IconSpinner className="h-4 w-4 text-indigo-600" />
          Loading paper details...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <Link
            href="/admin/papers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Back to Mock Directory
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "edit" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Raw Input & Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("review")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "review" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>Review, Options & Media</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {editableQuestions.length}
              </span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {success}
          </div>
        )}

        {activeTab === "edit" ? (
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Paper Parameters</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Paper Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Subject</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    <option>Quantitative Aptitude</option>
                    <option>Reasoning Ability</option>
                    <option>English Language</option>
                    <option>General Awareness</option>
                    <option>Computer Knowledge</option>
                    <option>Mixed Mock Test</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Duration (Minutes)</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <IconClock className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Status</label>
                  <div className="pt-2">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        isPublished
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Paper Text Inputs */}
            <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Paper Raw Text
                </label>
                <button
                  type="button"
                  onClick={handleReparse}
                  className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  ⚡ Re-parse from Text
                </button>
              </div>
              <textarea
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
                rows={14}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
              />

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Answer Key Text (e.g. 1-A, 2-C)
                </label>
                <textarea
                  value={keyText}
                  onChange={(e) => setKeyText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={savingMode !== null}
                onClick={() => handleUpdate(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {savingMode === "draft" ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                disabled={savingMode !== null}
                onClick={() => handleUpdate(true)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800"
              >
                {savingMode === "publish" ? "Publishing..." : "Update & Publish Paper"}
              </button>
            </div>
          </div>
        ) : (
          /* Pre-Save Question Review, Option Quick-Editor & Media */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-150 bg-indigo-50/50 p-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-950">Option Inspection & Media Studio</h3>
                <p className="text-xs text-indigo-700">
                  Click the pencil next to any option to edit choices directly, attach diagrams, or refine stems.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingMode !== null}
                  onClick={() => handleUpdate(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={savingMode !== null}
                  onClick={() => handleUpdate(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  Confirm &amp; Publish
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {editableQuestions.map((q, idx) => {
                const hasContext = Boolean(q.context?.trim());
                return (
                  <div
                    key={`${q.questionNumber}-${idx}`}
                    tabIndex={0}
                    onPaste={(e) => handlePasteImage(e, q.questionNumber)}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50"
                  >
                    {/* Shared Puzzle / Passage Context */}
                    {hasContext && (
                      <div className="mb-3 rounded-xl border border-indigo-150 bg-indigo-50/40 p-3 text-xs text-slate-800">
                        <span className="font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                          Shared Context / Directions
                        </span>
                        <div className="whitespace-pre-wrap leading-relaxed">{formatInlineMath(q.context!)}</div>
                      </div>
                    )}

                    {/* Question Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start gap-2.5 max-w-2xl">
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-indigo-50 text-xs font-black text-indigo-700">
                          {q.questionNumber || idx + 1}
                        </span>
                        <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                          {formatInlineMath(q.question)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          Key: {q.correctAnswer || "None"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingQuestion(q)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <IconEdit className="h-3 w-3 text-slate-500" />
                          Full Edit
                        </button>
                      </div>
                    </div>

                    {/* Diagram Preview */}
                    {q.imageDataUrl && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={q.imageDataUrl}
                          alt={`Diagram for Q${q.questionNumber}`}
                          className="max-h-64 max-w-full rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(q.questionNumber)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                          Remove Image
                        </button>
                      </div>
                    )}

                    {/* Options Grid with Inline Option-Edit Controls */}
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {LETTERS.map((letter) => {
                        const opt = q.options[letter];
                        const isCorrect = q.correctAnswer === letter;

                        if (!opt && opt !== "") {
                          // Allow adding missing option
                          return (
                            <button
                              key={letter}
                              type="button"
                              onClick={() =>
                                setEditingOption({
                                  questionNumber: q.questionNumber,
                                  letter,
                                  text: "",
                                })
                              }
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 p-2.5 text-xs text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600"
                            >
                              <IconPlus className="h-3 w-3" />
                              <span>Add Option {letter}</span>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={letter}
                            className={`group relative flex items-start justify-between gap-2 rounded-xl border p-2.5 text-xs transition ${
                              isCorrect
                                ? "border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-950"
                                : "border-slate-150 bg-slate-50/50 text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-500"
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 leading-relaxed">
                                {formatInlineMath(opt)}
                              </span>
                            </div>

                            {/* Option Quick Actions */}
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                title={`Edit Option ${letter}`}
                                onClick={() =>
                                  setEditingOption({
                                    questionNumber: q.questionNumber,
                                    letter,
                                    text: opt,
                                  })
                                }
                                className="rounded p-1 text-slate-400 hover:bg-white hover:text-indigo-600 shadow-xs"
                              >
                                <IconEdit className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title={`Clear Option ${letter}`}
                                onClick={() => handleDeleteOption(q.questionNumber, letter)}
                                className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 shadow-xs"
                              >
                                <IconTrash className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer: Image Upload Trigger */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                        <IconImage className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{q.imageDataUrl ? "Change Diagram" : "Attach Diagram"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleAttachImage(q.questionNumber, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Tip: Click card and press `Ctrl+V` to paste image
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- Focused Single-Option Editor Modal --- */}
      {editingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 font-bold text-white text-xs">
                  {editingOption.letter}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Option {editingOption.letter} · Question #{editingOption.questionNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOption(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Option Choice Text
              </label>
              <textarea
                rows={3}
                autoFocus
                value={editingOption.text}
                onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                placeholder="Enter choice text..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-indigo-600 focus:outline-none"
              />

              {/* Live formatted math preview */}
              {editingOption.text && (
                <div className="rounded-xl border border-slate-150 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Rendered Preview
                  </p>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {formatInlineMath(editingOption.text)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingOption(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSaveSingleOption(
                    editingOption.questionNumber,
                    editingOption.letter,
                    editingOption.text
                  )
                }
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Save Option
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Full Question Editor Modal --- */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Question #{editingQuestion.questionNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Context / Directions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.context || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, context: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Question Text
                </label>
                <textarea
                  rows={4}
                  value={editingQuestion.question}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, question: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Options (A–E)
                </label>
                <div className="space-y-2">
                  {LETTERS.map((letter) => (
                    <div key={letter} className="flex items-center gap-2">
                      <span className="w-5 text-center font-bold text-xs">{letter}</span>
                      <input
                        value={editingQuestion.options[letter] || ""}
                        onChange={(e) =>
                          setEditingQuestion({
                            ...editingQuestion,
                            options: { ...editingQuestion.options, [letter]: e.target.value },
                          })
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Correct Answer Key:
                </label>
                <select
                  value={editingQuestion.correctAnswer || ""}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      correctAnswer: (e.target.value as OptionLetter) || null,
                    })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold focus:border-indigo-600 focus:outline-none"
                >
                  <option value="">None</option>
                  {LETTERS.map((l) => (
                    <option key={l} value={l}>
                      Option {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveFullQuestion(editingQuestion)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}