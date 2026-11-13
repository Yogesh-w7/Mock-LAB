"use client";

import { formatInlineMath } from "../../../lib/format-inline-math";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { OptionLetter } from "@/lib/question-importer";

type QuestionWithImage = {
  id: string;
  questionNumber: number;
  question: string;
  options: Partial<Record<OptionLetter, string>>;
  correctAnswer: OptionLetter | null;
  imageDataUrl?: string;
  section?: string;
};

type AttemptRecord = {
  id: string;
  paperId: string;
  title: string;
  section: string;
  date: number;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  attempted: number;
  total: number;
  accuracy: number;
  durationSeconds: number;
  speed: number;
  answers: Record<number, OptionLetter>;
  marked?: number[];
};

type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: QuestionWithImage[];
  paperText: string;
  answerKeyText: string;
  savedAt: number;
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];
const SAVED_PAPERS_KEY = "ibps-mock-saved-papers-v1";
const ATTEMPT_HISTORY_KEY = "ibps-mock-attempt-history-v1";

function normalizeAnswer(value: unknown): OptionLetter | null {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/^OPTION\s*/, "")
    .replace(/^[([]/, "")
    .replace(/[)\].,]$/, "");
  if (LETTERS.includes(normalized as OptionLetter)) {
    return normalized as OptionLetter;
  }
  const match = normalized.match(/(?:ANSWER\s*[:=-]\s*)?([A-E])\b/);
  return match ? (match[1] as OptionLetter) : null;
}

function parseAnswerKeyText(text: string): Record<number, OptionLetter> {
  const result: Record<number, OptionLetter> = {};
  if (!text?.trim()) return result;
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
      if (Number.isFinite(n) && LETTERS.includes(letter)) result[n] = letter;
    }
  }
  return result;
}

function attachAnswerKey(
  questions: QuestionWithImage[],
  answerKeyText: string,
  extraMap?: Record<number, OptionLetter | null | undefined>
): QuestionWithImage[] {
  const fromText = parseAnswerKeyText(answerKeyText || "");
  return questions.map((q) => {
    const fromExtra = extraMap?.[q.questionNumber];
    const resolved =
      q.correctAnswer ??
      (fromExtra ? normalizeAnswer(fromExtra) : null) ??
      fromText[q.questionNumber] ??
      null;
    return { ...q, correctAnswer: resolved };
  });
}

function getAttemptById(id: string): AttemptRecord | null {
  try {
    const raw = localStorage.getItem(ATTEMPT_HISTORY_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function getPaperById(id: string): SavedPaper | null {
  try {
    const raw = localStorage.getItem(SAVED_PAPERS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    return list.find((item) => item.id === id) ?? null;
  } catch {
    return null;
  }
}

function readAttempts(): AttemptRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(ATTEMPT_HISTORY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeOptions(
  value: unknown
): Partial<Record<OptionLetter, string>> {
  const options: Partial<Record<OptionLetter, string>> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return options;
  const raw = value as Record<string, unknown>;
  for (const letter of LETTERS) {
    for (const key of [
      letter,
      letter.toLowerCase(),
      `option${letter}`,
      `option_${letter.toLowerCase()}`,
    ]) {
      const item = raw[key];
      if (typeof item === "string" || typeof item === "number") {
        options[letter] = String(item);
        break;
      }
    }
  }
  return options;
}

function normalizeQuestion(
  raw: Record<string, unknown>,
  index: number
): QuestionWithImage {
  const answer =
    raw.correctAnswer ??
    raw.correct_answer ??
    raw.answer ??
    raw.correctOption ??
    raw.correct_option ??
    raw.answerKey ??
    raw.answer_key;
  const optionsFromObj = normalizeOptions(raw.options);
  const options =
    optionsFromObj.A || optionsFromObj.B
      ? optionsFromObj
      : normalizeOptions({
          A: raw.optionA ?? raw.option_a ?? raw.A ?? raw.a,
          B: raw.optionB ?? raw.option_b ?? raw.B ?? raw.b,
          C: raw.optionC ?? raw.option_c ?? raw.C ?? raw.c,
          D: raw.optionD ?? raw.option_d ?? raw.D ?? raw.d,
          E: raw.optionE ?? raw.option_e ?? raw.E ?? raw.e,
        });
  const image =
    raw.imageDataUrl ??
    raw.image_data_url ??
    raw.imageUrl ??
    raw.image_url ??
    raw.diagramUrl ??
    raw.diagram_url;
  const questionNumber = Number(
    raw.questionNumber ?? raw.question_number ?? raw.number ?? index + 1
  );
  return {
    id: String(raw.id ?? `q-${index + 1}`),
    questionNumber:
      Number.isFinite(questionNumber) && questionNumber > 0
        ? questionNumber
        : index + 1,
    question: String(
      raw.question ??
        raw.questionText ??
        raw.question_text ??
        raw.text ??
        raw.statement ??
        ""
    ),
    options,
    correctAnswer: normalizeAnswer(answer),
    imageDataUrl: typeof image === "string" ? image : undefined,
    section:
      typeof raw.section === "string"
        ? raw.section
        : typeof raw.sectionName === "string"
          ? raw.sectionName
          : undefined,
  };
}

function extractQuestions(paper: Record<string, unknown>): QuestionWithImage[] {
  const directQuestions = paper.questions;
  if (Array.isArray(directQuestions)) {
    return directQuestions
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      )
      .map(normalizeQuestion);
  }
  if (Array.isArray(paper.sections)) {
    const questions: QuestionWithImage[] = [];
    let globalNumber = 1;
    for (const section of paper.sections) {
      if (!section || typeof section !== "object") continue;
      const sectionData = section as Record<string, unknown>;
      const sectionName = String(sectionData.name ?? "Section");
      const sectionQuestions = sectionData.questions;
      if (!Array.isArray(sectionQuestions)) continue;
      for (const raw of sectionQuestions) {
        if (!raw || typeof raw !== "object") continue;
        const normalized = normalizeQuestion(
          raw as Record<string, unknown>,
          globalNumber - 1
        );
        questions.push({
          ...normalized,
          questionNumber: globalNumber,
          section: normalized.section ?? sectionName,
        });
        globalNumber++;
      }
    }
    if (questions.length > 0) return questions;
  }
  const config = paper.exam_config ?? paper.examConfig;
  if (config && typeof config === "object") {
    const sections = (config as Record<string, unknown>).sections;
    if (Array.isArray(sections)) {
      const questions: QuestionWithImage[] = [];
      let globalNumber = 1;
      for (const section of sections) {
        if (!section || typeof section !== "object") continue;
        const sectionData = section as Record<string, unknown>;
        const sectionName = String(sectionData.name ?? "Section");
        const sectionQuestions = sectionData.questions;
        if (!Array.isArray(sectionQuestions)) continue;
        for (const raw of sectionQuestions) {
          if (!raw || typeof raw !== "object") continue;
          const normalized = normalizeQuestion(
            raw as Record<string, unknown>,
            globalNumber - 1
          );
          questions.push({
            ...normalized,
            questionNumber: globalNumber,
            section: normalized.section ?? sectionName,
          });
          globalNumber++;
        }
      }
      if (questions.length > 0) return questions;
    }
  }
  return [];
}

function extractKeyMapFromResult(
  result: unknown
): Record<number, OptionLetter> {
  const map: Record<number, OptionLetter> = {};
  if (!result || typeof result !== "object") return map;
  const r = result as Record<string, unknown>;
  for (const key of [
    "correctAnswers",
    "correct_answers",
    "answerKey",
    "answer_key",
    "keys",
  ]) {
    const obj = r[key];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const n = Number(k);
        const letter = normalizeAnswer(v);
        if (Number.isFinite(n) && letter) map[n] = letter;
      }
    }
  }
  const list = r.questions ?? r.review ?? r.items;
  if (Array.isArray(list)) {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const n = Number(
        row.questionNumber ?? row.question_number ?? row.number
      );
      const letter = normalizeAnswer(
        row.correctAnswer ??
          row.correct_answer ??
          row.answer ??
          row.correctOption
      );
      if (Number.isFinite(n) && letter) map[n] = letter;
    }
  }
  return map;
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function IconArrowLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
function IconAlertCircle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}
function IconCheckCircle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconClock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}
function IconTrendingUp({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconTrendingDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}
function IconTrophy({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4M5 4h14a2 2 0 012 2v2a7 7 0 01-7 7h0a7 7 0 01-7-7V6a2 2 0 012-2zm-2 2H2a4 4 0 004 7m14-7h2v2a4 4 0 01-4 5" />
    </svg>
  );
}
function IconTarget({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconZap({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent || "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2.5 text-2xl font-black tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();

  const attemptId =
    typeof params.attemptId === "string"
      ? params.attemptId
      : typeof params.id === "string"
        ? params.id
        : "";

  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [questions, setQuestions] = useState<QuestionWithImage[]>([]);
  const [reviewCurrent, setReviewCurrent] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(true);
  const [keySource, setKeySource] = useState<string>("");

  useEffect(() => {
    if (!attemptId) {
      setLoadError("No attempt identifier provided in URL.");
      setReviewLoading(false);
      return;
    }

    let cancelled = false;

    async function loadResultReview() {
      try {
        setReviewLoading(true);
        setLoadError("");

        const savedAttempt = getAttemptById(attemptId);
        if (!savedAttempt) {
          throw new Error(
            "Attempt history not found. It may have been cleared from browser storage."
          );
        }
        if (cancelled) return;
        setAttempt(savedAttempt);

        let recoveredQuestions: QuestionWithImage[] = [];
        let answerKeyText = "";
        let keyMap: Record<number, OptionLetter> = {};
        let sourceHint = "";

        try {
          const cached = localStorage.getItem(`bankprep-result-${attemptId}`);
          if (cached) {
            const resultPayload = JSON.parse(cached);
            keyMap = {
              ...keyMap,
              ...extractKeyMapFromResult(resultPayload),
              ...extractKeyMapFromResult(resultPayload?.result ?? resultPayload),
            };
            if (Object.keys(keyMap).length) sourceHint = "submit result cache";
          }
        } catch {
          /* ignore */
        }

        const localPaper = getPaperById(savedAttempt.paperId);
        if (localPaper?.questions?.length) {
          recoveredQuestions = localPaper.questions.map((q, index) =>
            normalizeQuestion(q as unknown as Record<string, unknown>, index)
          );
          answerKeyText =
            localPaper.answerKeyText ||
            (localPaper as { answer_key_text?: string }).answer_key_text ||
            "";
          if (!sourceHint) sourceHint = "local paper";
        }

        if (!recoveredQuestions.length || !answerKeyText) {
          try {
            const response = await fetch(
              `/api/exams/${encodeURIComponent(savedAttempt.paperId)}?review=1&attemptId=${encodeURIComponent(attemptId)}`,
              { method: "GET", cache: "no-store" }
            );
            const payload: unknown = await response.json().catch(() => null);
            if (response.ok && payload && typeof payload === "object") {
              const responseObject = payload as Record<string, unknown>;
              const paperValue =
                responseObject.paper ?? responseObject.exam ?? payload;
              if (paperValue && typeof paperValue === "object") {
                const paper = paperValue as Record<string, unknown>;
                const fromApi = extractQuestions(paper);
                if (fromApi.length) {
                  recoveredQuestions = fromApi;
                  sourceHint = sourceHint || "exam API";
                }
                answerKeyText =
                  answerKeyText ||
                  String(
                    paper.answer_key_text ??
                      paper.answerKeyText ??
                      paper.answer_key ??
                      ""
                  );
              }
              keyMap = {
                ...keyMap,
                ...extractKeyMapFromResult(responseObject.result),
                ...extractKeyMapFromResult(responseObject),
              };
            }
          } catch {
            /* continue */
          }
        }

        if (Object.keys(keyMap).length === 0) {
          try {
            const res2 = await fetch(
              `/api/exams/${encodeURIComponent(savedAttempt.paperId)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "result", attemptId }),
              }
            );
            const body = await res2.json().catch(() => null);
            if (res2.ok && body) {
              keyMap = {
                ...keyMap,
                ...extractKeyMapFromResult(body),
                ...extractKeyMapFromResult(body.result),
              };
              if (Object.keys(keyMap).length) {
                sourceHint = sourceHint
                  ? `${sourceHint} + result API`
                  : "result API";
              }
              if (
                body.paper &&
                typeof body.paper === "object" &&
                !recoveredQuestions.length
              ) {
                const fromResult = extractQuestions(
                  body.paper as Record<string, unknown>
                );
                if (fromResult.length) recoveredQuestions = fromResult;
              }
            }
          } catch {
            /* optional */
          }
        }

        if (!recoveredQuestions.length) {
          throw new Error(
            "The paper was found, but no questions were returned. Ensure GET /api/exams/[id] returns questions (and answer key after submit)."
          );
        }

        const withKeys = attachAnswerKey(
          recoveredQuestions,
          answerKeyText,
          keyMap
        );
        const keyedCount = withKeys.filter((q) => q.correctAnswer).length;

        if (keyedCount === 0) {
          const paperTextBlob =
            answerKeyText ||
            localPaper?.paperText ||
            localPaper?.answerKeyText ||
            "";
          const again = attachAnswerKey(withKeys, paperTextBlob, keyMap);
          if (!cancelled) {
            setQuestions(again);
            setKeySource(
              again.some((q) => q.correctAnswer)
                ? sourceHint || "parsed key text"
                : ""
            );
            setReviewCurrent(0);
            if (!again.some((q) => q.correctAnswer)) {
              setLoadError(
                "Questions loaded, but no answer key was found. Publish with a key (e.g. 1-c) or return correctAnswers from submit API."
              );
            }
          }
        } else if (!cancelled) {
          setQuestions(withKeys);
          setKeySource(sourceHint || "merged");
          setReviewCurrent(0);
        }

        try {
          const rawSaved = localStorage.getItem(SAVED_PAPERS_KEY) || "[]";
          const savedPapers: SavedPaper[] = JSON.parse(rawSaved);
          const existing = Array.isArray(savedPapers) ? savedPapers : [];
          const recoveredPaper: SavedPaper = {
            id: savedAttempt.paperId,
            title: savedAttempt.title,
            section: savedAttempt.section,
            minutes: 60,
            questions: withKeys,
            paperText: "",
            answerKeyText: answerKeyText,
            savedAt: Date.now(),
          };
          localStorage.setItem(
            SAVED_PAPERS_KEY,
            JSON.stringify([
              recoveredPaper,
              ...existing.filter((item) => item.id !== recoveredPaper.id),
            ])
          );
        } catch {
          /* ignore */
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load the result or question review."
          );
        }
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    }

    void loadResultReview();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  const answers = attempt?.answers || {};

  const previous = useMemo(() => {
    if (!attempt) return [];
    return readAttempts()
      .filter((item) => item.id !== attempt.id)
      .sort((a, b) => a.date - b.date);
  }, [attempt]);

  const last = previous[previous.length - 1];
  const scoreDelta = last
    ? Number((attempt!.score - last.score).toFixed(2))
    : null;
  const accuracyDelta =
    last && attempt ? attempt.accuracy - last.accuracy : null;

  if (loadError && !attempt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <IconAlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">
            Result not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {loadError}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <IconArrowLeft />
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-semibold text-slate-700">
            Loading result…
          </p>
        </div>
      </main>
    );
  }

  const durationSeconds = attempt.durationSeconds || 0;
  const speed = attempt.speed ?? 0;
  const currentQuestion = questions[reviewCurrent];
  const chosenAnswer = currentQuestion
    ? normalizeAnswer(answers[currentQuestion.questionNumber])
    : null;
  const hasAnswerKey = Boolean(currentQuestion?.correctAnswer);
  const isCorrect =
    hasAnswerKey && chosenAnswer === currentQuestion?.correctAnswer;
  const keysAttached = questions.filter((q) => q.correctAnswer).length;

  const scorePct =
    attempt.total > 0
      ? Math.min(100, Math.round((Number(attempt.score) / attempt.total) * 100))
      : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/80 pb-20 text-slate-900 antialiased">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* Top nav */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <IconArrowLeft className="transition group-hover:-translate-x-0.5" />
            Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/performance"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <IconTrendingUp className="h-3.5 w-3.5" />
              Analytics
            </Link>
            {attempt.paperId && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/exam/${encodeURIComponent(attempt.paperId)}`)
                }
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-md shadow-slate-900/15 transition hover:bg-slate-800"
              >
                Retake mock
              </button>
            )}
          </div>
        </header>

        {/* Hero score card */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-900/20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/25 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-200">
                  <IconTrophy className="h-3.5 w-3.5" />
                  Assessment report
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Mock complete
                </h1>
                <p className="mt-1.5 truncate text-sm text-slate-400">
                  {attempt.title}
                  <span className="mx-2 text-slate-600">·</span>
                  {attempt.section}
                </p>

                <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Score
                    </p>
                    <p className="mt-0.5 text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
                      {Number(attempt.score).toFixed(2)}
                      <span className="ml-1.5 text-lg font-semibold text-slate-500">
                        / {attempt.total}
                      </span>
                    </p>
                  </div>
                  <div className="pb-1">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10 sm:w-36">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all"
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-400">
                      {scorePct}% of max marks
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center backdrop-blur-sm">
                  <p className="text-2xl font-black tabular-nums text-emerald-300">
                    {attempt.correct}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/70">
                    Correct
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-center backdrop-blur-sm">
                  <p className="text-2xl font-black tabular-nums text-rose-300">
                    {attempt.wrong}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200/70">
                    Wrong
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-sm">
                  <p className="text-2xl font-black tabular-nums text-slate-200">
                    {attempt.unanswered}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Skipped
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            label="Accuracy"
            value={`${attempt.accuracy}%`}
            icon={IconTarget}
            accent="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Attempted"
            value={`${attempt.attempted}/${attempt.total}`}
            icon={IconCheckCircle}
            accent="bg-indigo-50 text-indigo-700"
          />
          <StatCard
            label="Pace"
            value={`${speed}/min`}
            icon={IconZap}
            accent="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Time"
            value={`${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`}
            icon={IconClock}
            accent="bg-slate-100 text-slate-600"
          />
        </section>

        {/* Deltas */}
        {(scoreDelta !== null || accuracyDelta !== null) && (
          <section className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Score vs previous
              </p>
              <div className="mt-2 flex items-center gap-2">
                {scoreDelta !== null &&
                  (scoreDelta >= 0 ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <IconTrendingUp />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <IconTrendingDown />
                    </span>
                  ))}
                <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {scoreDelta === null
                    ? "First attempt"
                    : `${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(2)}`}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Accuracy vs previous
              </p>
              <div className="mt-2 flex items-center gap-2">
                {accuracyDelta !== null &&
                  (accuracyDelta >= 0 ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <IconTrendingUp />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <IconTrendingDown />
                    </span>
                  ))}
                <p className="text-2xl font-extrabold tabular-nums text-slate-900">
                  {accuracyDelta === null
                    ? "—"
                    : `${accuracyDelta >= 0 ? "+" : ""}${accuracyDelta}%`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Review */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Question review
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Compare your choice with the official key
                {keysAttached > 0
                  ? ` · ${keysAttached}/${questions.length} keyed${
                      keySource ? ` · ${keySource}` : ""
                    }`
                  : ""}
              </p>
            </div>
            {questions.length > 0 && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold tabular-nums text-slate-600 shadow-sm">
                {reviewCurrent + 1} / {questions.length}
              </span>
            )}
          </div>

          {loadError && questions.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
              <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {loadError}
            </div>
          )}

          {reviewLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading questions and answer key…
              </p>
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <IconAlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                Review unavailable
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {loadError ||
                  "The exam API did not return questions for this paper."}
              </p>
            </div>
          ) : currentQuestion ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
              <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1">
                    {currentQuestion.section && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">
                        {currentQuestion.section}
                      </p>
                    )}
                    <h3 className="text-[15px] font-semibold leading-relaxed text-slate-900 sm:text-base">
                      <span className="mr-2 font-mono text-sm font-bold text-slate-400">
                        Q{currentQuestion.questionNumber}.
                      </span>
                      {formatInlineMath(currentQuestion.question || "")}
                    </h3>
                  </div>
                  <StatusBadge
                    hasKey={hasAnswerKey}
                    chosen={Boolean(chosenAnswer)}
                    correct={isCorrect}
                  />
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  {currentQuestion.imageDataUrl && (
                    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <img
                        src={currentQuestion.imageDataUrl}
                        alt={`Diagram for question ${currentQuestion.questionNumber}`}
                        className="mx-auto max-h-80 max-w-full rounded-lg object-contain"
                      />
                    </figure>
                  )}

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {LETTERS.filter(
                      (letter) => currentQuestion.options?.[letter]
                    ).map((letter) => {
                      const isAnswer =
                        currentQuestion.correctAnswer === letter;
                      const isChosen = chosenAnswer === letter;
                      return (
                        <div
                          key={letter}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm transition ${
                            isAnswer
                              ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400/40"
                              : isChosen
                                ? "border-rose-300 bg-rose-50 text-rose-950 ring-1 ring-rose-300/40"
                                : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isAnswer
                                ? "bg-emerald-600 text-white"
                                : isChosen
                                  ? "bg-rose-600 text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="min-w-0 flex-1 pt-0.5 leading-relaxed">
                            {formatInlineMath(
                              currentQuestion.options[letter] || ""
                            )}
                          </span>
                          {isAnswer && (
                            <span className="shrink-0 self-center text-[10px] font-bold uppercase text-emerald-700">
                              Key
                            </span>
                          )}
                          {isChosen && !isAnswer && (
                            <span className="shrink-0 self-center text-[10px] font-bold uppercase text-rose-600">
                              Yours
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center sm:gap-3 sm:p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        You
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {chosenAnswer ? chosenAnswer : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Key
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">
                        {currentQuestion.correctAnswer || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Marks
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          !hasAnswerKey
                            ? "text-slate-400"
                            : !chosenAnswer
                              ? "text-slate-500"
                              : isCorrect
                                ? "text-emerald-700"
                                : "text-rose-600"
                        }`}
                      >
                        {!hasAnswerKey
                          ? "—"
                          : !chosenAnswer
                            ? "0"
                            : isCorrect
                              ? "+1"
                              : "−0.25"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      disabled={reviewCurrent === 0}
                      onClick={() =>
                        setReviewCurrent((i) => Math.max(0, i - 1))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <IconArrowLeft />
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={reviewCurrent >= questions.length - 1}
                      onClick={() =>
                        setReviewCurrent((i) =>
                          Math.min(questions.length - 1, i + 1)
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <IconArrowLeft className="rotate-180" />
                    </button>
                  </div>
                </div>
              </article>

              {/* Palette sidebar */}
              <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:sticky lg:top-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Palette
                </p>
                <div className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-4">
                  {questions.map((question, index) => {
                    const selected = normalizeAnswer(
                      answers[question.questionNumber]
                    );
                    const hasKey = Boolean(question.correctAnswer);
                    const correct =
                      hasKey && selected === question.correctAnswer;
                    let style =
                      "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100";
                    if (correct) {
                      style =
                        "border-emerald-300 bg-emerald-50 text-emerald-800";
                    } else if (selected && hasKey) {
                      style = "border-rose-300 bg-rose-50 text-rose-800";
                    } else if (selected && !hasKey) {
                      style = "border-amber-200 bg-amber-50 text-amber-800";
                    }
                    if (index === reviewCurrent) {
                      style += " ring-2 ring-slate-900 ring-offset-1";
                    }
                    return (
                      <button
                        key={question.id || question.questionNumber}
                        type="button"
                        onClick={() => setReviewCurrent(index)}
                        className={`flex h-8 items-center justify-center rounded-lg border text-[11px] font-bold tabular-nums transition ${style}`}
                      >
                        {question.questionNumber}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Correct
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Incorrect
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    Skipped / no key
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({
  hasKey,
  chosen,
  correct,
}: {
  hasKey: boolean;
  chosen: boolean;
  correct: boolean;
}) {
  if (!hasKey) {
    return (
      <span className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        No key
      </span>
    );
  }
  if (!chosen) {
    return (
      <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
        Skipped
      </span>
    );
  }
  if (correct) {
    return (
      <span className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
        Correct
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
      Incorrect
    </span>
  );
}