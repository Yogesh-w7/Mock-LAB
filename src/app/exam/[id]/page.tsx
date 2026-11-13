"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatInlineMath } from "../../../lib/format-inline-math";
import type { OptionLetter } from "../../../lib/question-importer";

type QuestionWithImage = {
  id: string;
  questionNumber: number;
  sectionQuestionNumber: number;
  section: string;
  context?: string;
  question: string;
  options: Partial<Record<OptionLetter, string>>;
  correctAnswer: OptionLetter | null;
  imageDataUrl?: string;
  imageUrl?: string;
  marks?: number;
  negativeMarks?: number;
};

type ExamSection = {
  id: string;
  name: string;
  minutes: number;
  startIndex: number;
  endIndex: number;
};

type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: QuestionWithImage[];
  startedAt: number;
  examConfig?: {
    examPattern?: string;
    testType?: string;
    sections?: {
      id?: string;
      name: string;
      minutes: number;
      questionCount?: number;
      questions?: QuestionWithImage[];
    }[];
    [key: string]: unknown;
  };
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
  marked: number[];
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];
const ATTEMPT_HISTORY_KEY = "ibps-mock-attempt-history-v1";

// --- Precision Micro-Icons ---
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

function IconFlag({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  );
}

function IconRotateCcw({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconAlertCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
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

function IconLayoutGrid({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconLayers({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

async function examApi(
  paperId: string,
  options: {
    method?: "GET" | "POST";
    query?: string;
    body?: Record<string, unknown>;
  } = {}
) {
  const response = await fetch(
    `/api/exams/${encodeURIComponent(paperId)}${options.query || ""}`,
    {
      method: options.method || "GET",
      cache: "no-store",
      headers: options.body
        ? { "Content-Type": "application/json" }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "The exam request failed.");
  }

  return payload;
}

function readAttempts(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(ATTEMPT_HISTORY_KEY);
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function buildSections(
  questions: QuestionWithImage[],
  configured: NonNullable<SavedPaper["examConfig"]>["sections"],
  fallbackName: string,
  fallbackMinutes: number
): ExamSection[] {
  if (configured?.length) {
    let offset = 0;

    const result = configured.map((item, index) => {
      const name = String(item.name || `Section ${index + 1}`);

      const matched = questions
        .map((question, questionIndex) => ({ question, questionIndex }))
        .filter(({ question }) => question.section === name)
        .map(({ questionIndex }) => questionIndex);

      let startIndex: number;
      let endIndex: number;

      if (matched.length) {
        startIndex = matched[0];
        endIndex = matched[matched.length - 1] + 1;
      } else {
        const count = Math.max(
          0,
          Number(item.questionCount) || item.questions?.length || 0
        );

        startIndex = offset;
        endIndex = Math.min(questions.length, offset + count);
      }

      offset = Math.max(offset, endIndex);

      return {
        id: String(item.id || `section-${index + 1}`),
        name,
        minutes: Math.max(1, Number(item.minutes) || 20),
        startIndex,
        endIndex,
      };
    });

    const valid = result.filter((item) => item.endIndex > item.startIndex);
    if (valid.length) return valid;
  }

  return [
    {
      id: "section-1",
      name: fallbackName,
      minutes: Math.max(1, fallbackMinutes),
      startIndex: 0,
      endIndex: questions.length,
    },
  ];
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [paper, setPaper] = useState<SavedPaper | null>(null);
  const [examSections, setExamSections] = useState<ExamSection[]>([]);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionLetter>>({});
  const [marked, setMarked] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  const paperRef = useRef<SavedPaper | null>(null);
  const answersRef = useRef<Record<number, OptionLetter>>({});
  const markedRef = useRef<number[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const attemptIdRef = useRef("");
  const sectionIndexRef = useRef(0);
  const finishedRef = useRef(false);
  const savingRef = useRef(false);
  const transitionRef = useRef(false);

  paperRef.current = paper;
  answersRef.current = answers;
  markedRef.current = marked;
  startedAtRef.current = startedAt;
  attemptIdRef.current = attemptId;
  sectionIndexRef.current = sectionIndex;

  const activeSection = examSections[sectionIndex];

  const sectionQuestions = useMemo(() => {
    if (!paper || !activeSection) return [];

    return paper.questions
      .map((question, index) => ({ question, index }))
      .filter(
        ({ index }) =>
          index >= activeSection.startIndex &&
          index < activeSection.endIndex
      );
  }, [paper, activeSection]);

  const activeEntry = sectionQuestions.find(
    (entry) => entry.index === current
  );
  const active = activeEntry?.question;

  const sectionAnsweredCount = sectionQuestions.filter(
    ({ question }) => answers[question.questionNumber] !== undefined
  ).length;

  const totalAnswered = paper ? Object.keys(answers).length : 0;

  const sectionDeadline = useCallback(
    (index: number) => {
      if (!startedAt) return 0;

      const priorSeconds = examSections
        .slice(0, index + 1)
        .reduce((sum, item) => sum + item.minutes * 60, 0);

      return startedAt + priorSeconds * 1000;
    },
    [startedAt, examSections]
  );

  useEffect(() => {
    if (!id) {
      setLoadError("No paper ID was provided in the URL.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function initializeExam() {
      try {
        setReady(false);
        setLoadError("");
        finishedRef.current = false;
        transitionRef.current = false;

        const response = await fetch(
          `/api/exams/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load the paper.");
        }

        const data = payload.paper;

        if (!data || !Array.isArray(data.questions) || !data.questions.length) {
          throw new Error("This published paper has no available questions.");
        }

        const rawConfig = data.examConfig || data.exam_config || {};
        const rawConfiguredSections = Array.isArray(rawConfig.sections)
          ? rawConfig.sections
          : [];

        const rawQuestions = data.questions as Record<string, unknown>[];

        const safeQuestions: QuestionWithImage[] = rawQuestions.map(
          (question, index) => {
            const configuredSection = rawConfiguredSections.find(
              (sec: Record<string, unknown>) =>
                String(sec.name) === String(question.section)
            );

            const localNumber =
              Number(question.sectionQuestionNumber) ||
              Number(question.questionNumber) ||
              index + 1;

            const imageValue =
              typeof question.imageDataUrl === "string"
                ? question.imageDataUrl
                : typeof question.imageUrl === "string"
                  ? question.imageUrl
                  : typeof question.image_url === "string"
                    ? question.image_url
                    : undefined;

            return {
              id: String(question.id || `q-${index + 1}`),
              questionNumber: index + 1,
              sectionQuestionNumber: localNumber,
              section: String(
                question.section ||
                  configuredSection?.name ||
                  data.section ||
                  "General"
              ),
              context:
                typeof question.context === "string"
                  ? question.context
                  : undefined,
              question: String(
                question.question ||
                  question.questionText ||
                  question.text ||
                  ""
              ),
              options:
                question.options &&
                typeof question.options === "object" &&
                !Array.isArray(question.options)
                  ? (question.options as Partial<
                      Record<OptionLetter, string>
                    >)
                  : {},
              correctAnswer: null,
              imageDataUrl: imageValue,
              imageUrl:
                typeof question.imageUrl === "string"
                  ? question.imageUrl
                  : typeof question.image_url === "string"
                    ? question.image_url
                    : undefined,
              marks:
                typeof question.marks === "number"
                  ? question.marks
                  : undefined,
              negativeMarks:
                typeof question.negativeMarks === "number"
                  ? question.negativeMarks
                  : undefined,
            };
          }
        );

        const minutes = Math.max(1, Number(data.minutes) || 60);
        const sections = buildSections(
          safeQuestions,
          rawConfiguredSections,
          String(data.section || "General"),
          minutes
        );

        const normalizedQuestions = safeQuestions.map((question, index) => {
          const sec = sections.find(
            (item) => index >= item.startIndex && index < item.endIndex
          );

          return sec
            ? {
                ...question,
                section: sec.name,
                sectionQuestionNumber: index - sec.startIndex + 1,
              }
            : question;
        });

        const startPayload = await examApi(id, {
          method: "POST",
          body: { action: "start", mode: "full" },
        });

        if (cancelled) return;

        if (!startPayload.attempt?.id) {
          throw new Error("The server did not create an exam attempt.");
        }

        const attempt = startPayload.attempt;
        const startTime = attempt.started_at
          ? new Date(attempt.started_at).getTime()
          : Date.now();

        const savedPaper: SavedPaper = {
          id: String(data.id),
          title: String(data.title || "Mock Examination"),
          section: String(data.section || "General"),
          minutes,
          questions: normalizedQuestions,
          startedAt: startTime,
          examConfig: rawConfig,
        };

        setPaper(savedPaper);
        setExamSections(sections);
        setAttemptId(String(attempt.id));
        setStartedAt(startTime);
        setCurrent(0);
        setSectionIndex(0);
        setAnswers({});
        setMarked([]);

        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - startTime) / 1000)
        );

        let cumulative = 0;
        let activeIndex = 0;

        for (let index = 0; index < sections.length; index++) {
          const duration = sections[index].minutes * 60;

          if (elapsedSeconds < cumulative + duration) {
            activeIndex = index;
            break;
          }

          cumulative += duration;
          activeIndex = Math.min(index + 1, sections.length - 1);
        }

        const overallDuration = sections.reduce(
          (sum, sec) => sum + sec.minutes * 60,
          0
        );

        if (elapsedSeconds >= overallDuration) {
          setReady(true);
          setSectionIndex(sections.length - 1);
          setCurrent(Math.max(0, normalizedQuestions.length - 1));
          return;
        }

        setSectionIndex(activeIndex);
        setCurrent(sections[activeIndex]?.startIndex ?? 0);
        setSecondsLeft(
          Math.max(
            0,
            Math.ceil(
              (sectionDeadlineFor(startTime, sections, activeIndex) -
                Date.now()) /
                1000
            )
          )
        );

        setReady(true);
      } catch (error) {
        if (
          cancelled ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to initialize the exam."
        );
      }
    }

    initializeExam();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  const finishExam = useCallback(async () => {
    if (finishedRef.current || savingRef.current) return;

    const currentPaper = paperRef.current;
    const currentAttemptId = attemptIdRef.current;
    const startTime = startedAtRef.current;

    if (!currentPaper || !currentAttemptId || !startTime) return;

    savingRef.current = true;
    setSubmitting(true);
    setSaveError("");

    const finalAnswers = { ...answersRef.current };
    const finalMarked = [...markedRef.current];
    const duration = Math.max(
      1,
      Math.round((Date.now() - startTime) / 1000)
    );

    try {
      await examApi(currentPaper.id, {
        method: "POST",
        body: {
          action: "save",
          attemptId: currentAttemptId,
          answers: finalAnswers,
          markedQuestions: finalMarked,
          currentIndex: current,
        },
      });

      const submitted = await examApi(currentPaper.id, {
        method: "POST",
        body: {
          action: "submit",
          attemptId: currentAttemptId,
        },
      });

      const result = submitted.result;

      if (!result || typeof result !== "object") {
        throw new Error("The server did not return a grading result.");
      }

      finishedRef.current = true;

      const resultData = result as Record<string, unknown>;
      const correct = Number(
        resultData.correct ?? resultData.correct_count ?? 0
      );
      const wrong = Number(
        resultData.wrong ?? resultData.wrong_count ?? 0
      );
      const unanswered = Number(
        resultData.unanswered ??
          resultData.unanswered_count ??
          Math.max(
            0,
            currentPaper.questions.length - Object.keys(finalAnswers).length
          )
      );
      const attempted = Object.keys(finalAnswers).length;
      const score = Number(resultData.score ?? correct - wrong * 0.25);
      const accuracy =
        correct + wrong > 0
          ? Math.round((correct / (correct + wrong)) * 100)
          : 0;

      const record: AttemptRecord = {
        id: currentAttemptId,
        paperId: currentPaper.id,
        title: currentPaper.title,
        section: currentPaper.section,
        date: Date.now(),
        score: Number(score.toFixed(2)),
        correct,
        wrong,
        unanswered,
        attempted,
        total: currentPaper.questions.length,
        accuracy,
        durationSeconds: duration,
        speed: Number((attempted / (duration / 60)).toFixed(2)),
        answers: finalAnswers,
        marked: finalMarked,
      };

      try {
        localStorage.setItem(
          ATTEMPT_HISTORY_KEY,
          JSON.stringify([
            record,
            ...readAttempts().filter(
              (item) => item.id !== currentAttemptId
            ),
          ].slice(0, 500))
        );

        localStorage.setItem(
          `bankprep-result-${currentAttemptId}`,
          JSON.stringify(result)
        );
      } catch {
        // Fallback for full local storage
      }

      router.push(`/result/${encodeURIComponent(currentAttemptId)}`);
    } catch (error) {
      finishedRef.current = false;
      setSaveError(
        error instanceof Error ? error.message : "Could not submit the exam."
      );
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  }, [current, router]);

  const saveCurrentAnswers = useCallback(async () => {
    const currentPaper = paperRef.current;
    const currentAttemptId = attemptIdRef.current;

    if (!currentPaper || !currentAttemptId) return;

    await examApi(currentPaper.id, {
      method: "POST",
      body: {
        action: "save",
        attemptId: currentAttemptId,
        answers: { ...answersRef.current },
        markedQuestions: [...markedRef.current],
        currentIndex: current,
      },
    });
  }, [current]);

  const advanceSection = useCallback(async () => {
    if (transitionRef.current || finishedRef.current || savingRef.current) {
      return;
    }

    transitionRef.current = true;
    setTransitioning(true);
    setSaveError("");

    try {
      await saveCurrentAnswers();

      const nextSectionIndex = sectionIndexRef.current + 1;
      const allSections = examSections;

      if (nextSectionIndex >= allSections.length) {
        transitionRef.current = false;
        setTransitioning(false);
        await finishExam();
        return;
      }

      const nextSection = allSections[nextSectionIndex];

      setSectionIndex(nextSectionIndex);
      setCurrent(nextSection.startIndex);
      setSecondsLeft(
        Math.max(
          0,
          Math.ceil(
            (sectionDeadline(nextSectionIndex) - Date.now()) / 1000
          )
        )
      );

      transitionRef.current = false;
      setTransitioning(false);
    } catch (error) {
      transitionRef.current = false;
      setTransitioning(false);
      setSaveError(
        error instanceof Error
          ? `Could not advance section: ${error.message}`
          : "Could not save section. Please retry."
      );
    }
  }, [examSections, finishExam, saveCurrentAnswers, sectionDeadline]);

  useEffect(() => {
    if (!ready || !paper || !attemptId || !startedAt || !activeSection) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((sectionDeadline(sectionIndex) - Date.now()) / 1000)
      );

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        void advanceSection();
      }
    };

    updateTimer();

    const timer = window.setInterval(updateTimer, 250);

    return () => window.clearInterval(timer);
  }, [
    ready,
    paper,
    attemptId,
    startedAt,
    activeSection,
    sectionIndex,
    sectionDeadline,
    advanceSection,
  ]);

  function submitExam() {
    if (finishedRef.current || submitting) return;

    const unanswered = (paper?.questions.length || 0) - totalAnswered;

    if (
      window.confirm(
        `Submit your examination now?\n\nAnswered: ${totalAnswered}\nUnanswered: ${unanswered}\n\nYour responses will be graded immediately.`
      )
    ) {
      void finishExam();
    }
  }

  function toggleMarked(questionNumber: number) {
    setMarked((previous) =>
      previous.includes(questionNumber)
        ? previous.filter((number) => number !== questionNumber)
        : [...previous, questionNumber]
    );
  }

  function selectAnswer(letter: OptionLetter) {
    if (
      finishedRef.current ||
      submitting ||
      transitioning ||
      !active ||
      secondsLeft <= 0
    ) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [active.questionNumber]: letter,
    }));
  }

  function clearAnswer() {
    if (!active || secondsLeft <= 0 || transitioning) return;

    setAnswers((previous) => {
      const next = { ...previous };
      delete next[active.questionNumber];
      return next;
    });
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <IconAlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold tracking-tight">Assessment Session Failed</h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {loadError}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!paper || !ready || !activeSection) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="text-xs font-semibold text-slate-700">
            Loading assessment workspace…
          </p>
        </div>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Question Unavailable</h2>
          <p className="mt-1 text-xs text-slate-500">
            No question exists at the current index position.
          </p>
          <Link href="/" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isLowTime = secondsLeft <= 60;
  const isSelectedMarked = marked.includes(active.questionNumber);
  const isAnsweredActive = Boolean(answers[active.questionNumber]);
  const progress = Math.round(
    (sectionAnsweredCount / Math.max(1, sectionQuestions.length)) * 100
  );

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 antialiased selection:bg-slate-900 selection:text-white pb-12">
      {/* Sticky Header with Section Tabs & Real-Time Clock */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Identity & Current Section Indicators */}
          <div className="min-w-0 flex-1">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-900 transition"
            >
              <IconArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
              BankPrep Exam Portal
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                {paper.title}
              </h1>
              {examSections.length > 1 && (
                <span className="hidden items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 sm:inline-flex">
                  <IconLayers className="h-3 w-3 text-slate-500" />
                  Section {sectionIndex + 1} of {examSections.length}
                </span>
              )}
            </div>
          </div>

          {/* Dual-Stage Section Timer & Finish Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              role="timer"
              aria-label={`Time remaining in section: ${formatTime(secondsLeft)}`}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold tabular-nums transition-all sm:text-sm ${
                isLowTime
                  ? "animate-pulse border-slate-900 bg-slate-900 text-white shadow-xs"
                  : "border-slate-200 bg-slate-100 text-slate-800"
              }`}
            >
              <IconClock className={`h-4 w-4 ${isLowTime ? "text-white" : "text-slate-500"}`} />
              <div className="text-left">
                <span className="block leading-none">{formatTime(secondsLeft)}</span>
                <span className={`block font-sans text-[8px] uppercase tracking-wider font-semibold ${isLowTime ? "text-slate-300" : "text-slate-400"}`}>
                  Section Timer
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting || transitioning}
              onClick={submitExam}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5"
            >
              <IconCheckCircle className="h-3.5 w-3.5" />
              <span>{submitting ? "Submitting..." : "Finish Test"}</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Tabs (Read-only status of sections in IBPS/SBI pattern) */}
        {examSections.length > 1 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {examSections.map((sec, idx) => {
                const isActive = idx === sectionIndex;
                const isCompleted = idx < sectionIndex;

                return (
                  <div
                    key={sec.id}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      isActive
                        ? "border border-slate-900 bg-slate-900 text-white shadow-xs"
                        : isCompleted
                          ? "border border-slate-200 bg-white text-slate-500 line-through decoration-slate-400"
                          : "border border-dashed border-slate-200 bg-transparent text-slate-400"
                    }`}
                  >
                    <span className="font-mono text-[10px]">{idx + 1}.</span>
                    <span>{sec.name}</span>
                    {isActive && (
                      <span className="ml-1 rounded-sm bg-white/20 px-1 text-[9px] font-mono">
                        {formatTime(secondsLeft)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Progress Bar */}
        <div className="h-1 w-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        {/* Left Column: Active Question Workspace */}
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-7">
          {/* Card Top Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800">
                {activeSection.name}
              </span>
              <span className="text-xs text-slate-400">· Single Choice</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Question {active.sectionQuestionNumber} of {sectionQuestions.length}
              </span>
            </div>
          </div>

          {/* Section Transition Feedback */}
          {transitioning && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs font-semibold text-slate-800">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-slate-900" />
              <span>Saving section responses and transitioning to the next section…</span>
            </div>
          )}

          {saveError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
              <IconAlertCircle className="h-4 w-4 shrink-0 text-slate-900" />
              <span>{saveError}</span>
              <button
                type="button"
                className="ml-auto font-bold underline hover:text-black"
                onClick={() => {
                  setSaveError("");
                  void advanceSection();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Shared Context / Reasoning Directions Container */}
          {active.context && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-800 sm:text-sm">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Directions / Shared Passage
              </span>
              <div className="whitespace-pre-wrap leading-relaxed font-sans text-slate-800">
                {formatInlineMath(active.context)}
              </div>
            </div>
          )}

          {/* Question Text */}
          <div className="mt-6">
            <h2 className="whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-slate-900 sm:text-lg">
              <span className="mr-2 font-mono font-bold text-slate-400">
                Q{active.sectionQuestionNumber}.
              </span>
              {formatInlineMath(active.question || "")}
            </h2>

            {/* Diagram / Chart Image Attachment */}
            {(active.imageDataUrl || active.imageUrl) && (
              <figure className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={active.imageDataUrl || active.imageUrl}
                  alt={`Diagram for question ${active.sectionQuestionNumber}`}
                  loading="lazy"
                  className="mx-auto max-h-[500px] max-w-full rounded-lg object-contain"
                />
                <figcaption className="mt-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Figure / Chart Reference
                </figcaption>
              </figure>
            )}
          </div>

          {/* Option Choices List */}
          <div className="mt-7 space-y-2.5">
            {LETTERS.filter((letter) => active.options?.[letter]).map((letter) => {
              const selected = answers[active.questionNumber] === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  aria-pressed={selected}
                  disabled={submitting || transitioning || secondsLeft <= 0}
                  onClick={() => selectAnswer(letter)}
                  className={`group flex w-full items-start gap-3.5 rounded-xl border p-3.5 text-left transition-all sm:p-4 ${
                    selected
                      ? "border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      selected
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300"
                    }`}
                  >
                    {letter}
                  </span>

                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-xs font-medium leading-relaxed text-slate-800 sm:text-sm">
                    {formatInlineMath(active.options[letter] || "")}
                  </span>

                  {selected && (
                    <span className="self-center text-xs font-semibold text-slate-900">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}

            {LETTERS.filter((letter) => active.options?.[letter]).length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                No answer choices detected for this item. Proceed to next question or review test paper.
              </div>
            )}
          </div>

          {/* Navigation & Action Controls */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={
                  current <= activeSection.startIndex ||
                  submitting ||
                  transitioning
                }
                onClick={() =>
                  setCurrent((index) =>
                    Math.max(activeSection.startIndex, index - 1)
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconArrowLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                type="button"
                disabled={submitting || transitioning || secondsLeft <= 0}
                onClick={() => toggleMarked(active.questionNumber)}
                aria-pressed={isSelectedMarked}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                  isSelectedMarked
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <IconFlag className="h-3.5 w-3.5" />
                <span>{isSelectedMarked ? "Marked for Review" : "Mark for Review"}</span>
              </button>

              <button
                type="button"
                disabled={
                  !isAnsweredActive ||
                  submitting ||
                  transitioning ||
                  secondsLeft <= 0
                }
                onClick={clearAnswer}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-xs transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconRotateCcw className="h-3 w-3" />
                Clear
              </button>
            </div>

            <button
              type="button"
              disabled={
                current >= activeSection.endIndex - 1 ||
                submitting ||
                transitioning
              }
              onClick={() =>
                setCurrent((index) =>
                  Math.min(activeSection.endIndex - 1, index + 1)
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Next</span>
              <IconArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Right Column: Question Palette & Section Overview */}
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconLayoutGrid className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Question Palette
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500">
                {sectionAnsweredCount}/{sectionQuestions.length}
              </span>
            </div>

            {/* Section Progress Bar */}
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Palette Grid (Guarded with padding to eliminate top-row clipping) */}
            <div className="mt-3 max-h-[300px] overflow-y-auto px-1 pb-1.5 pt-2.5 [scrollbar-width:thin]">
              <div className="grid grid-cols-5 gap-2">
                {sectionQuestions.map(({ question, index }) => {
                  const answered = answers[question.questionNumber] !== undefined;
                  const isMarked = marked.includes(question.questionNumber);
                  const isCurrent = current === index;

                  let paletteStyle = "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300";

                  if (isMarked && answered) {
                    paletteStyle = "border-slate-900 bg-slate-800 text-white font-bold";
                  } else if (isMarked) {
                    paletteStyle = "border-slate-400 bg-slate-200 text-slate-900 font-bold hover:bg-slate-300";
                  } else if (answered) {
                    paletteStyle = "border-slate-900 bg-slate-900 text-white font-bold";
                  }

                  return (
                    <button
                      key={question.id}
                      type="button"
                      aria-label={`Question ${question.sectionQuestionNumber}${
                        answered ? ", answered" : ", unanswered"
                      }${isMarked ? ", marked for review" : ""}`}
                      aria-current={isCurrent ? "step" : undefined}
                      disabled={submitting || transitioning}
                      onClick={() => setCurrent(index)}
                      className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-all focus:outline-none ${
                        isCurrent ? "ring-2 ring-slate-900 ring-offset-1 font-black shadow-xs" : ""
                      } ${paletteStyle}`}
                    >
                      {question.sectionQuestionNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Legend */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-50" />
                <span>Unvisited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-slate-400 bg-slate-200" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" />
                <span>Ans. + Review</span>
              </div>
            </div>

            {/* Attempt Summary */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Attempted
                </p>
                <p className="mt-0.5 font-bold text-slate-900">{sectionAnsweredCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Remaining
                </p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {Math.max(0, sectionQuestions.length - sectionAnsweredCount)}
                </p>
              </div>
            </div>

            {/* Current Active Section Card */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current section
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {formatTime(secondsLeft)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">{activeSection.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeSection.minutes} minutes allotted
              </p>
            </div>

            {/* Finish Action */}
            <button
              type="button"
              disabled={submitting || transitioning}
              onClick={submitExam}
              className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Test Paper"}
            </button>
          </div>

          <p className="text-center text-[11px] font-medium text-slate-400">
            Section answers are locked and saved at transitions. Timed according to IBPS / SBI guidelines.
          </p>
        </aside>
      </div>
    </main>
  );
}

function sectionDeadlineFor(
  startedAt: number,
  sections: ExamSection[],
  index: number
): number {
  const totalSeconds = sections
    .slice(0, index + 1)
    .reduce((sum, section) => sum + section.minutes * 60, 0);

  return startedAt + totalSeconds * 1000;
}