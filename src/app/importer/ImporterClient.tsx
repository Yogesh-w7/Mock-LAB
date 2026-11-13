
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { parsePaper, type OptionLetter } from "@/lib/question-importer";
import {
  getPaperById,
  readSavedPapers,
  writeSavedPapers,
  type QuestionWithImage,
  type SavedPaper,
} from "@/lib/storage";
import { formatInlineMath } from "@/lib/format-inline-math";

type ExamSectionConfig = {
  key: string;
  title: string;
  minutes: number;
  fromQ: number;
  toQ: number;
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];

const SECTIONS = [
  "Quantitative Aptitude",
  "Reasoning Ability",
  "English Language",
  "General Awareness",
  "Computer Awareness",
  "Full Mock Test",
];

const DEFAULT_FULL_MOCK_SECTIONS: ExamSectionConfig[] = [
  { key: "english", title: "English Language", minutes: 20, fromQ: 1, toQ: 30 },
  { key: "quant", title: "Quantitative Aptitude", minutes: 20, fromQ: 31, toQ: 65 },
  { key: "reasoning", title: "Reasoning Ability", minutes: 20, fromQ: 66, toQ: 100 },
];

const SAMPLE_PAPER = `Directions (Q. 1-2): Read the following passage and answer the questions.
A certain number of candidates appeared for an entrance examination in three shifts.

Q1. What is 25% of 240?
A) 40
B) 50
C) 60
D) 70

Q2. If 5x = 40, find x.
A) 5
B) 6
C) 8
D) 10

Q3. A shopkeeper buys an item for Rs. 500 and sells it for Rs. 600. What is the profit percentage?
A) 10%
B) 15%
C) 20%
D) 25%`;

const SAMPLE_KEY = `1-C
2-C
3-C`;

// --- Inline SVGs & Micro-Icons ---

function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconUploadCloud({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function IconFileText({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconSparkles({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function IconCheckCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconAlertTriangle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function IconImage({ className = "w-3.5 h-3.5" }: { className?: string }) {
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

function IconPlay({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
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

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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

export default function ImporterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [paper, setPaper] = useState("");
  const [keyText, setKeyText] = useState("");
  const [section, setSection] = useState("Quantitative Aptitude");
  const [minutes, setMinutes] = useState(20);
  const [title, setTitle] = useState("IBPS Practice Mock");

  // Multi-section breakdown for Full Mock Tests (IBPS/SBI)
  const [fullMockSections, setFullMockSections] = useState<ExamSectionConfig[]>(
    DEFAULT_FULL_MOCK_SECTIONS
  );

  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [unmatched, setUnmatched] = useState<number[]>([]);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  // Sync overall timer when sections change in Full Mock mode
  useEffect(() => {
    if (section === "Full Mock Test") {
      const sumMinutes = fullMockSections.reduce((acc, curr) => acc + (Number(curr.minutes) || 0), 0);
      setMinutes(sumMinutes > 0 ? sumMinutes : 60);
    }
  }, [section, fullMockSections]);

  useEffect(() => {
    if (!editId) return;

    try {
      const selected = getPaperById(editId);

      if (!selected) {
        setSaveNotice({ text: "The requested saved mock could not be found.", type: "error" });
        return;
      }

      setTitle(selected.title);
      setSection(selected.section);
      setMinutes(selected.minutes);
      setPaper(selected.paperText);
      setKeyText(selected.answerKeyText);
      setQuestions(selected.questions);
      setSavedId(selected.id);

      // Convert saved question-number arrays into the editor's range format.
      if (selected.examConfig?.sections && Array.isArray(selected.examConfig.sections)) {
        const restoredSections: ExamSectionConfig[] = selected.examConfig.sections.map(
          (savedSection, index) => {
            const questionNumbers = Array.isArray(savedSection.questionNumbers)
              ? savedSection.questionNumbers.filter(Number.isFinite)
              : [];

            return {
              key: savedSection.key || `section-${index + 1}`,
              title: savedSection.title || `Section ${index + 1}`,
              minutes: Math.max(1, Number(savedSection.minutes) || 20),
              fromQ: questionNumbers.length ? Math.min(...questionNumbers) : 1,
              toQ: questionNumbers.length ? Math.max(...questionNumbers) : 1,
            };
          }
        );

        if (restoredSections.length > 0) {
          setFullMockSections(restoredSections);
        }
      }

      setSaveNotice({ text: "Existing mock loaded successfully into the studio.", type: "success" });
    } catch {
      setSaveNotice({ text: "Could not load this mock from browser storage.", type: "error" });
    }
  }, [editId]);

  function clearMessages() {
    setErrors([]);
    setUnmatched([]);
    setSaveNotice(null);
  }

  function handlePaperChange(value: string) {
    setPaper(value);
    setQuestions([]);
    setSavedId(null);
    clearMessages();
  }

  function handleKeyChange(value: string) {
    setKeyText(value);
    setQuestions([]);
    setSavedId(null);
    clearMessages();
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    clearMessages();

    try {
      const text = await file.text();
      if (!text.trim()) {
        setSaveNotice({ text: "The selected file is empty.", type: "error" });
        return;
      }

      handlePaperChange(text);
      setSaveNotice({
        text: `Imported "${file.name}". Generate a preview to review question options.`,
        type: "success",
      });
    } catch {
      setSaveNotice({ text: "Could not read the selected file.", type: "error" });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function loadSample() {
    setPaper(SAMPLE_PAPER);
    setKeyText(SAMPLE_KEY);
    setTitle("IBPS Practice Mock");
    setSection("Quantitative Aptitude");
    setMinutes(10);
    setQuestions([]);
    setSavedId(null);
    setErrors([]);
    setUnmatched([]);
    setSaveNotice({ text: "Sample mock loaded. Click Generate Preview below.", type: "info" });
  }

  // Pre-configured Pattern Presets (IBPS & SBI)
  function applyPatternPreset(preset: "ibps-prelims" | "rrb-prelims") {
    if (preset === "ibps-prelims") {
      setTitle("IBPS / SBI PO Prelims Full Mock");
      setSection("Full Mock Test");
      setFullMockSections([
        { key: "english", title: "English Language", minutes: 20, fromQ: 1, toQ: 30 },
        { key: "quant", title: "Quantitative Aptitude", minutes: 20, fromQ: 31, toQ: 65 },
        { key: "reasoning", title: "Reasoning Ability", minutes: 20, fromQ: 66, toQ: 100 },
      ]);
    } else if (preset === "rrb-prelims") {
      setTitle("IBPS RRB Officer Scale-I Prelims Mock");
      setSection("Full Mock Test");
      setFullMockSections([
        { key: "reasoning", title: "Reasoning Ability", minutes: 22, fromQ: 1, toQ: 40 },
        { key: "quant", title: "Quantitative Aptitude", minutes: 23, fromQ: 41, toQ: 80 },
      ]);
    }
  }

  function clearPaper() {
    setPaper("");
    setKeyText("");
    setQuestions([]);
    setErrors([]);
    setUnmatched([]);
    setSavedId(null);
    setSaveNotice(null);
  }

  // Determine section assignment based on question number
  function resolveQuestionSection(qNum: number): string {
    if (section !== "Full Mock Test") return section;
    const match = fullMockSections.find((s) => qNum >= s.fromQ && qNum <= s.toQ);
    return match ? match.title : "General";
  }

  function generatePreview() {
    clearMessages();

    if (!paper.trim()) {
      setSaveNotice({ text: "Please paste questions or upload a text file first.", type: "error" });
      return;
    }

    try {
      const result = parsePaper(paper, keyText, section);

      // Enhance questions with section tags based on question number
      const parsedWithSections = (result.questions as QuestionWithImage[]).map((q) => ({
        ...q,
        section: resolveQuestionSection(q.questionNumber),
      }));

      setQuestions(parsedWithSections);
      setErrors(result.errors);
      setUnmatched(result.unmatchedAnswerNumbers);
      setSavedId(null);

      if (parsedWithSections.length === 0) {
        setSaveNotice({
          text: "No questions recognized. Verify question format starts with Q1, Q2, etc.",
          type: "error",
        });
        return;
      }

      setSaveNotice({
        text: `Preview ready: Successfully parsed ${parsedWithSections.length} question(s).`,
        type: "success",
      });
    } catch (error) {
      setQuestions([]);
      setSaveNotice({
        text: error instanceof Error ? `Parsing error: ${error.message}` : "Could not parse this paper.",
        type: "error",
      });
    }
  }

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
    if (!context) throw new Error("Could not process image on canvas.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(original, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.82);
  }

  async function attachImageToQuestion(questionNumber: number, file?: File) {
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

      setSavedId(null);
      setSaveNotice({
        text: `Diagram attached to Question ${questionNumber}. Save mock to persist.`,
        type: "success",
      });
    } catch (error) {
      setSaveNotice({
        text: error instanceof Error ? error.message : "Could not attach image.",
        type: "error",
      });
    }
  }

  function handleQuestionPaste(event: ClipboardEvent<HTMLElement>, questionNumber: number) {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/")
    );
    const file = item?.getAsFile();

    if (file) {
      event.preventDefault();
      void attachImageToQuestion(questionNumber, file);
    }
  }

  function removeImage(questionNumber: number) {
    setQuestions((previous) =>
      previous.map((question) => {
        if (question.questionNumber !== questionNumber) return question;
        const { imageDataUrl: _removedImage, ...rest } = question;
        return rest;
      })
    );
    setSavedId(null);
    setSaveNotice({
      text: `Removed diagram from Question ${questionNumber}.`,
      type: "info",
    });
  }

  function buildRecord(id: string): SavedPaper {
    const isFull = section === "Full Mock Test";

    return {
      id,
      title: title.trim() || "Untitled Mock",
      section,
      minutes: Math.max(1, Number(minutes) || 1),
      questions,
      paperText: paper,
      answerKeyText: keyText,
      savedAt: Date.now(),
      examConfig: {
        mode: isFull ? "full" : "sectional",
        marksPerQuestion: 1,
        negativeMarks: 0.25,
        sections: isFull
          ? fullMockSections.map((s) => ({
              key: s.key,
              title: s.title,
              minutes: Math.max(1, Number(s.minutes) || 20),
              questionNumbers: Array.from(
                {
                  length: Math.max(
                    0,
                    Math.floor(s.toQ) - Math.ceil(s.fromQ) + 1
                  ),
                },
                (_, i) => Math.ceil(s.fromQ) + i
              ),
            }))
          : [],
      },
    };
  }

  function persistPaper(id: string) {
    if (questions.length === 0) {
      throw new Error("Generate a question preview before saving.");
    }

    const existing = readSavedPapers();
    const record = buildRecord(id);

    writeSavedPapers([
      record,
      ...existing.filter((saved) => saved.id !== id),
    ]);

    setSavedId(id);
  }

  function savePaper() {
    try {
      const id = savedId || crypto.randomUUID();
      persistPaper(id);

      setSaveNotice({
        text: "Mock test successfully saved to local storage.",
        type: "success",
      });
    } catch (error) {
      setSaveNotice({
        text: error instanceof Error ? error.message : "Could not save mock.",
        type: "error",
      });
    }
  }

  function startExam() {
    if (questions.length === 0) {
      setSaveNotice({
        text: "Please generate a preview before launching the exam.",
        type: "error",
      });
      return;
    }

    try {
      const id = savedId || crypto.randomUUID();
      persistPaper(id);
      router.push(`/exam/${id}`);
    } catch (error) {
      setSaveNotice({
        text: error instanceof Error ? error.message : "Could not start test.",
        type: "error",
      });
    }
  }

  const matchedAnswers = questions.filter((q) => Boolean(q.correctAnswer)).length;

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Navigation Bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <IconArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Assessment Studio
          </span>
        </header>

        {/* Page Title */}
        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
            <IconSparkles className="h-4 w-4" />
            Exam Authoring
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Import & Configure Mock Paper
          </h1>
          <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
            Create single-subject drills or full multi-sectional papers with IBPS/SBI timed section limits.
          </p>
        </div>

        {/* Status Notice Banner */}
        {saveNotice && (
          <div
            role="status"
            className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium leading-relaxed transition-all ${
              saveNotice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : saveNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-indigo-200 bg-indigo-50 text-indigo-900"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {saveNotice.type === "error" && <IconAlertTriangle className="h-4 w-4 text-rose-600" />}
              {saveNotice.type === "success" && <IconCheckCircle className="h-4 w-4 text-emerald-600" />}
              {saveNotice.type === "info" && <IconSparkles className="h-4 w-4 text-indigo-600" />}
            </div>
            <p className="flex-1">{saveNotice.text}</p>
          </div>
        )}

        {/* Configuration Card */}
        <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Paper Format & Parameters</h2>
              <p className="text-xs text-slate-400">Configure title, sectional timers, and examination structure</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPatternPreset("ibps-prelims")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                IBPS / SBI Prelims Preset (100 Qs)
              </button>
              <button
                type="button"
                onClick={loadSample}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                <IconSparkles className="h-3.5 w-3.5" />
                Sample Test
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="mock-title" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Mock Examination Title
              </label>
              <input
                id="mock-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. IBPS PO Prelims 2026 - Live Mock 01"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mock-section" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Examination Format
              </label>
              <select
                id="mock-section"
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 sm:text-sm"
              >
                {SECTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mock-minutes" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                {section === "Full Mock Test" ? "Total Time (Auto-calculated)" : "Timer Duration (Minutes)"}
              </label>
              <input
                id="mock-minutes"
                type="number"
                min={1}
                max={300}
                disabled={section === "Full Mock Test"}
                value={minutes}
                onChange={(event) =>
                  setMinutes(Math.min(300, Math.max(1, Number(event.target.value) || 1)))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-900 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm"
              />
            </div>
          </div>

          {/* IBPS/SBI Sectional Breakdown Configurator (shown only when Full Mock is selected) */}
          {section === "Full Mock Test" && (
            <div className="rounded-2xl border border-indigo-150 bg-indigo-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    Sectional Allocation &amp; Timing (IBPS / SBI Pattern)
                  </h3>
                  <p className="text-[11px] text-indigo-700">
                    Map question ranges to sections. Each section receives its own strict countdown timer during testing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFullMockSections((prev) => [
                      ...prev,
                      {
                        key: `section-${prev.length + 1}`,
                        title: "General Awareness",
                        minutes: 20,
                        fromQ: prev.length ? prev[prev.length - 1].toQ + 1 : 1,
                        toQ: prev.length ? prev[prev.length - 1].toQ + 30 : 30,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
                >
                  <IconPlus className="h-3 w-3" />
                  <span>Add Section</span>
                </button>
              </div>

              <div className="space-y-3">
                {fullMockSections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white bg-white/90 p-3 shadow-xs text-xs"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 font-bold text-indigo-800 text-[11px]">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-44">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Section Name
                      </label>
                      <input
                        value={sec.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFullMockSections((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Timer (Min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={sec.minutes}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setFullMockSections((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, minutes: val } : s))
                          );
                        }}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div className="w-32">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Question Range
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={sec.fromQ}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 1;
                            setFullMockSections((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, fromQ: val } : s))
                            );
                          }}
                          className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-xs text-center font-bold focus:border-indigo-600 focus:outline-none"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <input
                          type="number"
                          value={sec.toQ}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 1;
                            setFullMockSections((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, toQ: val } : s))
                            );
                          }}
                          className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-xs text-center font-bold focus:border-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {fullMockSections.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setFullMockSections((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Remove section"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-5 space-y-4">
            {/* Raw Questions Textarea */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="paper-text" className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Question Paper Raw Text
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {paper.length.toLocaleString()} characters
                </span>
              </div>

              <textarea
                id="paper-text"
                value={paper}
                onChange={(event) => handlePaperChange(event.target.value)}
                rows={12}
                spellCheck={false}
                placeholder={`Paste questions here...

Directions (Q. 1-5): Study the information carefully...
Eight persons sit around a table...

Q1. What is the position of C with respect to F?
A) Immediate left
B) Second to the left
C) Opposite
D) Second to the right
E) Third to the right`}
                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 placeholder:font-sans placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <IconUploadCloud className="h-4 w-4 text-indigo-600" />
                    <span>{busy ? "Reading..." : "Upload Plain Text (.txt)"}</span>
                    <input
                      type="file"
                      accept=".txt,.text,text/plain"
                      disabled={busy}
                      onChange={handleFileImport}
                      className="sr-only"
                    />
                  </label>

                  {paper && (
                    <button
                      type="button"
                      onClick={clearPaper}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  Formatted for Q1., Q2. followed by choices A), B), C), D), E)
                </p>
              </div>
            </div>

            {/* Answer Key Accordion */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
              <button
                type="button"
                onClick={() => setShowAnswerKey((val) => !val)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    Answer Key Configuration
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Optional mapping for automatic test grading (+1 correct, −0.25 penalty)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                  <span>{showAnswerKey ? "Collapse" : "Expand"}</span>
                  <IconChevronDown className={`h-4 w-4 transition-transform ${showAnswerKey ? "rotate-180" : ""}`} />
                </div>
              </button>

              {showAnswerKey && (
                <div className="mt-3 border-t border-slate-200/60 pt-3">
                  <textarea
                    id="answer-key"
                    value={keyText}
                    onChange={(event) => handleKeyChange(event.target.value)}
                    rows={4}
                    spellCheck={false}
                    placeholder={`1-C\n2-C\n3-C\n(or Q1. C)`}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Format: &quot;1-C&quot; or &quot;Q1. C&quot; on individual lines.
                  </p>
                </div>
              )}
            </div>

            {/* Generate Preview Action */}
            <button
              type="button"
              onClick={generatePreview}
              disabled={busy || !paper.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-xs font-bold text-white shadow-md shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  <span>Parsing Questions...</span>
                </>
              ) : (
                <>
                  <IconFileText className="h-4 w-4" />
                  <span>Generate Question Preview</span>
                </>
              )}
            </button>

            {/* Error & Warning Banners */}
            {errors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <IconAlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Parser Warnings ({errors.length})</span>
                </div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800">
                  {errors.map((err, idx) => (
                    <li key={`${idx}-${err}`}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {unmatched.length > 0 && (
              <p className="text-xs font-medium text-amber-700">
                Unmatched answer keys detected for Question numbers: {unmatched.join(", ")}.
              </p>
            )}
          </div>
        </section>

        {/* Live Preview & Review Section */}
        {questions.length > 0 && (
          <section className="mt-8 space-y-6">
            {/* Summary Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Parsing Complete
                  </span>
                  <h2 className="text-lg font-bold text-emerald-950">{title.trim() || "Untitled Mock"}</h2>
                  <p className="text-xs text-emerald-700 font-medium">
                    {section} <span className="text-emerald-400">·</span> {minutes} Minutes Total
                    {section === "Full Mock Test" && ` (${fullMockSections.length} Timed Sections)`}
                  </p>
                </div>

                <div className="flex gap-4">
                  <div className="rounded-xl bg-white/80 border border-emerald-200/80 px-4 py-2 text-center shadow-sm">
                    <p className="text-lg font-black text-slate-900">{questions.length}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Questions</p>
                  </div>
                  <div className="rounded-xl bg-white/80 border border-emerald-200/80 px-4 py-2 text-center shadow-sm">
                    <p className="text-lg font-black text-emerald-700">{matchedAnswers}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Keys Mapped</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Header & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Questions &amp; Section Assignments</h3>
                <p className="text-xs text-slate-500">Inspect mathematical expressions, choices, and attach figure diagrams</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={savePaper}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {savedId ? "Update Saved Paper" : "Save Paper"}
                </button>
                <button
                  type="button"
                  onClick={startExam}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800"
                >
                  <IconPlay className="h-3 w-3 text-indigo-400" />
                  <span>Start Live Mock</span>
                </button>
              </div>
            </div>

            {/* Questions Review Cards */}
            <div className="space-y-4">
              {questions.map((question, index) => {
                const assignedSection = resolveQuestionSection(question.questionNumber);
                return (
                  <article
                    key={`${question.questionNumber}-${index}`}
                    onPaste={(event) => handleQuestionPaste(event, question.questionNumber)}
                    tabIndex={0}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50"
                  >
                    {/* Shared Puzzle / Passage Context Container */}
                    {question.context && (
                      <div className="mb-3 rounded-xl border border-indigo-150 bg-indigo-50/40 p-3 text-xs text-slate-800">
                        <span className="font-bold uppercase tracking-wider text-indigo-700 block mb-1 text-[10px]">
                          Directions / Shared Reading Passage
                        </span>
                        <div className="whitespace-pre-wrap leading-relaxed">{formatInlineMath(question.context)}</div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-extrabold text-indigo-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Question {question.questionNumber}
                            </span>
                            {section === "Full Mock Test" && (
                              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.2 text-[10px] font-bold text-indigo-700">
                                {assignedSection}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-900">
                            {formatInlineMath(question.question)}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${
                          question.correctAnswer
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {question.correctAnswer ? `Key: ${question.correctAnswer}` : "No Answer Key"}
                      </span>
                    </div>

                    {/* Diagram Preview */}
                    {question.imageDataUrl && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={question.imageDataUrl}
                          alt={`Diagram for question ${question.questionNumber}`}
                          className="max-h-64 max-w-full rounded-lg object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(question.questionNumber)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                          Remove Diagram
                        </button>
                      </div>
                    )}

                    {/* Options Grid */}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {LETTERS.map((letter) => {
                        const option = question.options?.[letter];
                        if (!option) return null;
                        const isCorrect = question.correctAnswer === letter;

                        return (
                          <div
                            key={letter}
                            className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                              isCorrect
                                ? "border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-950"
                                : "border-slate-150 bg-slate-50/50 text-slate-700"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold ${
                                isCorrect ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-500"
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="min-w-0 flex-1 whitespace-pre-wrap pt-0.5 leading-relaxed">
                              {formatInlineMath(option)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Attachment Actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        <IconImage className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Attach Figure / Diagram</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void attachImageToQuestion(question.questionNumber, file);
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>

                      <span className="text-[11px] text-slate-400">
                        Tip: Click card and press `Ctrl+V` to paste an image directly
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={savePaper}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {savedId ? "Update Saved Paper" : "Save to Practice Library"}
              </button>

              <button
                type="button"
                onClick={startExam}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800"
              >
                <IconPlay className="h-3.5 w-3.5 text-indigo-400" />
                <span>Launch Mock Test</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
