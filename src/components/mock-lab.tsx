"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SECTIONS, type ExamSection, type MockConfig, type Question, type QuestionBankRecord, type StoredAttempt, type TimerMode } from "@/types/mock";
import { SAMPLE_QUESTIONS } from "@/lib/sample-questions";
import { getAllAttempts, getAllQuestions, getAttempt, getLatestInProgressAttempt, saveAttempt, saveQuestions } from "@/lib/db";

type Screen = "home" | "setup" | "exam" | "results";

const INITIAL_CONFIG: MockConfig = {
  title: "My IBPS Practice Mock",
  exam: "IBPS Clerk Prelims",
  timerMode: "total",
  totalDurationMinutes: 60,
  sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
  strictSectionLock: true,
  allowSectionNavigation: true,
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function remainingSeconds(deadline: number | null) {
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function makeAttempt(config: MockConfig, questions: Question[]): StoredAttempt {
  const now = Date.now();
  const ids = questions.map((q) => q.id);
  return {
    id: crypto.randomUUID(),
    config,
    questionIds: ids,
    answers: {},
    markedQuestionIds: [],
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    startedAt: now,
    totalDeadline: config.timerMode === "total" ? now + config.totalDurationMinutes * 60_000 : null,
    sectionStartedAt: now,
    sectionDeadline: config.timerMode === "section" ? now + (config.sections[0]?.durationMinutes ?? 1) * 60_000 : null,
    status: "in-progress",
    updatedAt: now,
  };
}

export default function MockLab() {
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<MockConfig>(INITIAL_CONFIG);
  const [questions, setQuestions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [attempt, setAttempt] = useState<StoredAttempt | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [savedQuestionCount, setSavedQuestionCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [notice, setNotice] = useState("Sample questions are loaded. Your own imported question bank will be added in Phase 2.");
  const [hydrated, setHydrated] = useState(false);
  const expiryHandledRef = useRef<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const [saved, attempts] = await Promise.all([getAllQuestions(), getAllAttempts()]);
      setSavedQuestionCount(saved.length);
      setAttemptCount(attempts.length);
    } catch {
      // IndexedDB may not be available until the page runs in a browser.
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    void refreshStats();
  }, [refreshStats]);

  const attemptQuestions = useMemo(() => {
    if (!attempt) return [];
    return attempt.questionIds.map((id) => questions.find((q) => q.id === id)).filter((q): q is Question => Boolean(q));
  }, [attempt, questions]);

  const sections = attempt?.config.sections ?? config.sections;
  const currentSection = attempt ? sections[attempt.currentSectionIndex] : undefined;
  const currentSectionQuestions = attemptQuestions.filter((q) => q.sectionId === currentSection?.id);
  const currentQuestion = currentSectionQuestions[attempt?.currentQuestionIndex ?? 0];

  const submitAttempt = useCallback(async (reason: string) => {
    if (!attempt) return;
    const submitted = { ...attempt, status: "submitted" as const, updatedAt: Date.now() };
    await saveAttempt(submitted);
    setAttempt(submitted);
    setNotice(reason);
    setScreen("results");
    await refreshStats();
  }, [attempt, refreshStats]);

  useEffect(() => {
    if (screen !== "exam" || !attempt || attempt.status !== "in-progress" || attempt.config.timerMode === "untimed") return;

    const update = () => {
      const isTotalTimer = attempt.config.timerMode === "total";
      const deadline = isTotalTimer ? attempt.totalDeadline : attempt.sectionDeadline;
      const seconds = remainingSeconds(deadline);
      setRemaining(seconds);

      if (seconds !== 0) return;
      const expiryKey = isTotalTimer ? `${attempt.id}:total` : `${attempt.id}:section:${attempt.currentSectionIndex}`;
      if (expiryHandledRef.current === expiryKey) return;
      expiryHandledRef.current = expiryKey;

      if (!isTotalTimer) {
        const nextSectionIndex = attempt.currentSectionIndex + 1;
        if (nextSectionIndex < attempt.config.sections.length) {
          const nextSection = attempt.config.sections[nextSectionIndex];
          const now = Date.now();
          const updated: StoredAttempt = {
            ...attempt,
            currentSectionIndex: nextSectionIndex,
            currentQuestionIndex: 0,
            sectionStartedAt: now,
            sectionDeadline: now + nextSection.durationMinutes * 60_000,
            updatedAt: now,
          };
          setAttempt(updated);
          setRemaining(nextSection.durationMinutes * 60);
          void saveAttempt(updated);
          setNotice(`Section time expired. Moved to ${nextSection.name}.`);
          return;
        }
        void submitAttempt("The final section timer expired. Your mock has been submitted.");
        return;
      }

      void submitAttempt("Total exam time expired. Your answers have been saved.");
    };

    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [screen, attempt, submitAttempt]);

  function updateSection(index: number, patch: Partial<ExamSection>) {
    setConfig((old) => ({ ...old, sections: old.sections.map((s, i) => i === index ? { ...s, ...patch } : s) }));
  }

  async function startMock() {
    if (config.timerMode === "total" && config.totalDurationMinutes < 1) {
      setNotice("Total duration must be at least one minute.");
      return;
    }
    if (config.timerMode === "section" && config.sections.some((s) => !Number.isFinite(s.durationMinutes) || s.durationMinutes < 1)) {
      setNotice("Each section duration must be at least one minute.");
      return;
    }
    const chosen = SAMPLE_QUESTIONS.filter((q) => config.sections.some((s) => s.id === q.sectionId));
    const next = makeAttempt(structuredClone(config), chosen);
    await saveAttempt(next);
    setAttempt(next);
    setQuestions(SAMPLE_QUESTIONS);
    setScreen("exam");
    setNotice("Mock started. Sample questions are for testing the engine, not official IBPS papers.");
  }

  async function resumeAttempt() {
    const existing = await getLatestInProgressAttempt();
    if (!existing) {
      setNotice("No saved in-progress mock was found.");
      return;
    }
    setAttempt(existing);
    setConfig(existing.config);
    setScreen("exam");
    setNotice("Resumed saved mock.");
  }

  async function saveResponse(optionId: string) {
    if (!attempt || !currentQuestion) return;
    const updated: StoredAttempt = { ...attempt, answers: { ...attempt.answers, [currentQuestion.id]: optionId }, updatedAt: Date.now() };
    setAttempt(updated);
    await saveAttempt(updated);
  }

  async function moveQuestion(direction: -1 | 1) {
    if (!attempt || !currentSection) return;
    const nextIndex = attempt.currentQuestionIndex + direction;
    if (nextIndex >= 0 && nextIndex < currentSectionQuestions.length) {
      const updated = { ...attempt, currentQuestionIndex: nextIndex, updatedAt: Date.now() };
      setAttempt(updated);
      await saveAttempt(updated);
      return;
    }
    if (direction === 1 && attempt.config.allowSectionNavigation) {
      const nextSectionIndex = attempt.currentSectionIndex + 1;
      if (nextSectionIndex < sections.length) {
        const updated = {
          ...attempt,
          currentSectionIndex: nextSectionIndex,
          currentQuestionIndex: 0,
          sectionStartedAt: Date.now(),
          sectionDeadline: attempt.config.timerMode === "section" ? Date.now() + sections[nextSectionIndex].durationMinutes * 60_000 : null,
          updatedAt: Date.now(),
        };
        setAttempt(updated);
        await saveAttempt(updated);
      }
    }
  }

  async function toggleMark() {
    if (!attempt || !currentQuestion) return;
    const marked = new Set(attempt.markedQuestionIds);
    marked.has(currentQuestion.id) ? marked.delete(currentQuestion.id) : marked.add(currentQuestion.id);
    const updated = { ...attempt, markedQuestionIds: [...marked], updatedAt: Date.now() };
    setAttempt(updated);
    await saveAttempt(updated);
  }

  async function seedLocalBank() {
    const records: QuestionBankRecord[] = SAMPLE_QUESTIONS.map((q) => ({ ...q, exam: "Sample", verified: true, createdAt: Date.now() }));
    await saveQuestions(records);
    await refreshStats();
    setNotice("Sample questions saved to IndexedDB on this device. Importing your own papers comes in Phase 2.");
  }

  async function clearCurrentAttempt() {
    if (!attempt) return;
    await submitAttempt("Mock submitted manually.");
  }

  if (!hydrated) return <main className="min-h-screen p-8"><div className="mx-auto max-w-5xl animate-pulse">Loading IBPS Mock Lab…</div></main>;

  const answeredCount = attemptQuestions.filter((q) => Boolean(attempt?.answers[q.id])).length;
  const correctCount = attemptQuestions.filter((q) => attempt?.answers[q.id] === q.correctOptionId).length;
  const incorrectCount = attemptQuestions.filter((q) => attempt?.answers[q.id] && attempt.answers[q.id] !== q.correctOptionId).length;
  const score = attemptQuestions.reduce((sum, q) => sum + (attempt?.answers[q.id] === q.correctOptionId ? q.marks : attempt?.answers[q.id] ? -q.negativeMarks : 0), 0);

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button className="flex items-center gap-3 text-left" onClick={() => setScreen("home")} aria-label="Go to dashboard">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-lg font-bold text-white">M</span>
            <span><span className="block font-bold tracking-tight">IBPS Mock Lab</span><span className="block text-xs text-slate-500">Offline-first practice</span></span>
          </button>
          <div className="flex items-center gap-3">
            <a
              href="/importer"
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Import Questions
            </a>
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex">Local-first starter</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {notice && <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</div>}

        {screen === "home" && (
          <>
            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand">Your personal exam workspace</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Practise smarter. Pay nothing.</h1>
              <p className="mt-3 max-w-2xl text-slate-600">Build mocks from your own question papers, practise offline, and track your progress. This starter currently includes sample questions to test the exam flow.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setScreen("setup")} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">Create mock test</button>
                <a href="/importer" className="rounded-xl border border-brand bg-white px-5 py-3 font-semibold text-brand hover:bg-blue-50">Import Questions / Answer Key</a>
                <button onClick={resumeAttempt} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">Resume saved mock</button>
                <button onClick={seedLocalBank} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold hover:bg-slate-50">Save sample bank locally</button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[{ label: "Questions saved locally", value: savedQuestionCount }, { label: "Mock attempts saved", value: attemptCount }, { label: "Default sections", value: 3 }].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold">{item.value}</p></div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Included in this first version</h2>
              <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <li>✓ Three configurable sections</li><li>✓ Manual total, section, or no timer</li><li>✓ Local IndexedDB attempt saving</li><li>✓ Automatic scoring with negative marks</li><li>✓ Resume after refresh</li><li>○ PDF import and OCR come next</li>
              </ul>
            </div>
          </>
        )}

        {screen === "setup" && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <button onClick={() => setScreen("home")} className="mb-5 text-sm font-semibold text-brand">← Dashboard</button>
            <h1 className="text-2xl font-bold">Create your mock</h1>
            <p className="mt-2 text-sm text-slate-600">Set your own duration. Official exam timings are not forced.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">Mock name<input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold">Exam<select value={config.exam} onChange={(e) => setConfig({ ...config, exam: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"><option>IBPS Clerk Prelims</option><option>IBPS Clerk Mains</option><option>IBPS PO Prelims</option><option>IBPS PO Mains</option><option>IBPS RRB Clerk</option><option>IBPS RRB PO</option><option>Custom Mock</option></select></label>
            </div>
            <fieldset className="mt-7">
              <legend className="font-semibold">Timer mode</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {([{ value: "total", label: "Total timer", detail: "One countdown for the whole mock" }, { value: "section", label: "Section timers", detail: "Each section has its own duration" }, { value: "untimed", label: "No timer", detail: "Practise without time pressure" }] as const).map((mode) => (
                  <button key={mode.value} onClick={() => setConfig({ ...config, timerMode: mode.value as TimerMode })} className={`rounded-xl border p-4 text-left ${config.timerMode === mode.value ? "border-brand bg-blue-50 ring-1 ring-brand" : "border-slate-200 hover:bg-slate-50"}`}><span className="block font-semibold">{mode.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{mode.detail}</span></button>
                ))}
              </div>
            </fieldset>
            {config.timerMode === "total" && (
              <div className="mt-5 max-w-xs"><label className="text-sm font-semibold">Total duration (minutes)<input type="number" min={1} max={600} value={config.totalDurationMinutes} onChange={(e) => setConfig({ ...config, totalDurationMinutes: Number(e.target.value) })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><p className="mt-1 text-xs text-slate-500">Example: 45, 60, 90 or 120 minutes.</p></div>
            )}
            <div className="mt-7">
              <div className="flex items-end justify-between gap-3"><div><h2 className="font-semibold">Sections</h2><p className="text-sm text-slate-500">Rename sections and set individual durations.</p></div><button onClick={() => setConfig({ ...config, sections: [...config.sections, { id: `section-${crypto.randomUUID()}`, name: `Section ${config.sections.length + 1}`, durationMinutes: 15 }] })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">+ Add section</button></div>
              <div className="mt-3 space-y-3">
                {config.sections.map((section, index) => (
                  <div key={section.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_150px_auto] sm:items-end">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section name<input value={section.name} onChange={(e) => updateSection(index, { name: e.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink" /></label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration (min)<input type="number" min={1} max={600} value={section.durationMinutes} onChange={(e) => updateSection(index, { durationMinutes: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink" /></label>
                    <button disabled={config.sections.length <= 1} onClick={() => setConfig({ ...config, sections: config.sections.filter((s) => s.id !== section.id) })} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input id="strict" type="checkbox" checked={config.strictSectionLock} onChange={(e) => setConfig({ ...config, strictSectionLock: e.target.checked })} /><label htmlFor="strict" className="text-sm">Lock a section after its timer expires (section timer mode).</label></div>
            <div className="mt-6 flex flex-wrap gap-3"><button onClick={startMock} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">Start mock</button><button onClick={() => setConfig(INITIAL_CONFIG)} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold">Reset settings</button></div>
          </section>
        )}

        {screen === "exam" && attempt && currentSection && currentQuestion && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div><p className="text-sm text-slate-500">{attempt.config.exam}</p><h1 className="text-xl font-bold">{attempt.config.title}</h1><p className="text-sm text-slate-600">{currentSection.name}</p></div>
              <div className="text-right"><p className="text-xs uppercase tracking-wide text-slate-500">{attempt.config.timerMode === "untimed" ? "Untimed practice" : attempt.config.timerMode === "total" ? "Time remaining" : "Section time remaining"}</p><p className={`font-mono text-2xl font-bold ${remaining !== null && remaining < 300 ? "text-rose-600" : "text-ink"}`}>{attempt.config.timerMode === "untimed" ? "∞" : formatTime(remaining ?? 0)}</p></div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-brand">{currentSection.name}</span><span className="text-sm text-slate-500">Question {attempt.currentQuestionIndex + 1} of {currentSectionQuestions.length}</span></div>
                <h2 className="mt-6 text-lg font-semibold leading-8">{currentQuestion.text}</h2>
                <div className="mt-5 space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button key={option.id} onClick={() => void saveResponse(option.id)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${attempt.answers[currentQuestion.id] === option.id ? "border-brand bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-300 text-sm font-semibold">{String.fromCharCode(65 + index)}</span><span>{option.text}</span></button>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                  <button disabled={attempt.currentQuestionIndex === 0} onClick={() => void moveQuestion(-1)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Previous</button>
                  <button onClick={() => void toggleMark()} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${attempt.markedQuestionIds.includes(currentQuestion.id) ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-300"}`}>{attempt.markedQuestionIds.includes(currentQuestion.id) ? "Marked for review" : "Mark for review"}</button>
                  <button onClick={() => void saveResponse("")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Clear response</button>
                  <button onClick={() => void moveQuestion(1)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{attempt.currentQuestionIndex === currentSectionQuestions.length - 1 ? "Next section →" : "Save & Next"}</button>
                </div>
              </div>
              <aside className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold">Question palette</h2>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {currentSectionQuestions.map((q, index) => {
                    const answered = Boolean(attempt.answers[q.id]);
                    const marked = attempt.markedQuestionIds.includes(q.id);
                    const active = index === attempt.currentQuestionIndex;
                    return <button key={q.id} onClick={() => { const next = { ...attempt, currentQuestionIndex: index, updatedAt: Date.now() }; setAttempt(next); void saveAttempt(next); }} aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}`} className={`h-10 rounded-lg border text-sm font-semibold ${active ? "border-brand bg-brand text-white" : marked ? "border-amber-400 bg-amber-50 text-amber-800" : answered ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50"}`}>{index + 1}</button>;
                  })}
                </div>
                <div className="mt-5 space-y-2 text-xs text-slate-600"><p>🟩 Answered: {currentSectionQuestions.filter((q) => Boolean(attempt.answers[q.id])).length}</p><p>⬜ Unanswered: {currentSectionQuestions.filter((q) => !attempt.answers[q.id]).length}</p><p>🟨 Marked: {currentSectionQuestions.filter((q) => attempt.markedQuestionIds.includes(q.id)).length}</p></div>
                <button onClick={clearCurrentAttempt} className="mt-6 w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700">Submit mock</button>
              </aside>
            </div>
          </section>
        )}

        {screen === "results" && attempt && (
          <section className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Mock completed</p><h1 className="mt-2 text-3xl font-bold">{attempt.config.title}</h1><p className="mt-2 text-slate-600">{notice}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">{[{ label: "Score", value: score.toFixed(2) }, { label: "Correct", value: correctCount }, { label: "Incorrect", value: incorrectCount }, { label: "Attempted", value: answeredCount }].map((stat) => <div key={stat.label} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{stat.label}</p><p className="mt-1 text-2xl font-bold">{stat.value}</p></div>)}</div>
              <h2 className="mt-8 text-lg font-bold">Review answers</h2>
              <div className="mt-3 space-y-3">{attemptQuestions.map((q, index) => { const selected = attempt.answers[q.id]; const correct = selected === q.correctOptionId; return <article key={q.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold">{index + 1}. {q.text}</p><p className={`mt-2 text-sm font-semibold ${correct ? "text-emerald-700" : selected ? "text-rose-700" : "text-slate-500"}`}>{correct ? "Correct" : selected ? "Incorrect" : "Not attempted"}{selected ? ` · Your answer: ${q.options.find((o) => o.id === selected)?.text ?? "Cleared"}` : ""}</p><p className="mt-1 text-sm text-slate-600">Correct answer: {q.options.find((o) => o.id === q.correctOptionId)?.text ?? "Not set"}</p>{q.explanation && <p className="mt-2 text-sm text-slate-600">Explanation: {q.explanation}</p>}</article>; })}</div>
              <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => { setAttempt(null); setScreen("setup"); setNotice("Configure your next mock."); }} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">Create another mock</button><button onClick={() => setScreen("home")} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold">Dashboard</button></div>
            </div>
          </section>
        )}
      </div>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500 sm:px-6">Phase 1 starter · Questions are stored locally only when you choose “Save sample bank locally” · PDF import and OCR are planned next.</footer>
    </main>
  );
}
