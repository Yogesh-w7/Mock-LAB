"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AttemptRecord = {
  id: string;
  paperId?: string;
  title: string;
  section: string;
  date: number;
  score: number;
  correct: number;
  wrong: number;
  unanswered?: number;
  attempted: number;
  total: number;
  accuracy: number;
  durationSeconds: number;
  speed?: number;
};

const ATTEMPTS_KEY = "ibps-mock-attempt-history-v1";
const XP_PER_LEVEL = 250;

function readAttempts(): AttemptRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function xpFromAttempt(a: AttemptRecord) {
  let xp = Math.max(0, Math.round((a.score || 0) * 10));
  if ((a.accuracy || 0) >= 80) xp += 20;
  if ((a.accuracy || 0) >= 90) xp += 15;
  if (a.attempted === a.total && a.total > 0) xp += 10;
  if ((a.accuracy || 0) === 100 && a.total > 0) xp += 25;
  return Math.max(10, xp);
}

function rankTitle(level: number) {
  if (level >= 20) return "Exam Legend";
  if (level >= 15) return "Bank Pro";
  if (level >= 10) return "Serious Aspirant";
  if (level >= 5) return "Rising Star";
  if (level >= 2) return "Beginner";
  return "Rookie";
}

// --- Interactive Icon Components ---
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconFlame({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.9z" />
    </svg>
  );
}

function IconTarget({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function IconTrophy({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4M5 4h14a2 2 0 012 2v2a7 7 0 01-7 7h0a7 7 0 01-7-7V6a2 2 0 012-2zm-2 2H2a2 2 0 00-2 2v1a4 4 0 004 4h1m14-7h1a2 2 0 012 2v1a4 4 0 01-4 4h-1" />
    </svg>
  );
}

function IconSparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function IconBolt({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconLock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  );
}

function IconTrendingUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function IconTrendingDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function PerformancePage() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [filterSection, setFilterSection] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      setAttempts(readAttempts());
    }
    load();
    window.addEventListener("focus", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const sections = useMemo(() => {
    const set = new Set(attempts.map((a) => a.section).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [attempts]);

  const filtered = useMemo(() => {
    const list =
      filterSection === "All"
        ? attempts
        : attempts.filter((a) => a.section === filterSection);
    return [...list].sort((a, b) => b.date - a.date);
  }, [attempts, filterSection]);

  const selected =
    filtered.find((a) => a.id === selectedId) || filtered[0] || null;

  // ── XP / Level ──────────────────────────────────────────────────────────
  const totalXp = attempts.reduce((s, a) => s + xpFromAttempt(a), 0);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const xpProgress = (xpIntoLevel / XP_PER_LEVEL) * 100;
  const title = rankTitle(level);

  // ── Core metrics ────────────────────────────────────────────────────────
  const totalAttempts = attempts.length;
  const avgAccuracy = totalAttempts
    ? Math.round(
        attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / totalAttempts
      )
    : 0;
  const avgScore = totalAttempts
    ? (
        attempts.reduce((s, a) => s + (a.score || 0), 0) / totalAttempts
      ).toFixed(1)
    : "0";
  const bestScore = totalAttempts
    ? Math.max(...attempts.map((a) => a.score || 0))
    : 0;
  const bestAccuracy = totalAttempts
    ? Math.max(...attempts.map((a) => a.accuracy || 0))
    : 0;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrong || 0), 0);
  const totalAttemptedQs = attempts.reduce(
    (s, a) => s + (a.attempted || 0),
    0
  );

  // ── Streak Calculation ──────────────────────────────────────────────────
  const streak = useMemo(() => {
    if (!attempts.length) return 0;
    const days = new Set(
      attempts.map((a) => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = today.getTime();
    if (!days.has(cursor)) {
      cursor -= 86400000;
      if (!days.has(cursor)) return 0;
    }
    let count = 0;
    while (days.has(cursor)) {
      count++;
      cursor -= 86400000;
    }
    return count;
  }, [attempts]);

  // ── Badges ──────────────────────────────────────────────────────────────
  const badges = useMemo(() => {
    const has80 = attempts.some((a) => (a.accuracy || 0) >= 80);
    const has90 = attempts.some((a) => (a.accuracy || 0) >= 90);
    const has100 = attempts.some(
      (a) => (a.accuracy || 0) === 100 && a.total > 0
    );
    const fullAttempt = attempts.some(
      (a) => a.attempted === a.total && a.total > 0
    );

    return [
      {
        id: "first",
        name: "First Blood",
        detail: "Complete first mock",
        earned: attempts.length >= 1,
        icon: IconSparkles,
      },
      {
        id: "sharp",
        name: "Sharp Shooter",
        detail: "Reach 80% accuracy",
        earned: has80,
        icon: IconTarget,
      },
      {
        id: "elite",
        name: "Elite Aim",
        detail: "Hit 90% accuracy",
        earned: has90,
        icon: IconTrophy,
      },
      {
        id: "perfect",
        name: "Perfect Paper",
        detail: "Score 100% accuracy",
        earned: has100,
        icon: IconShield,
      },
      {
        id: "complete",
        name: "Full Focus",
        detail: "Attempt all questions",
        earned: fullAttempt,
        icon: IconBolt,
      },
      {
        id: "streak3",
        name: "Momentum",
        detail: "3-day streak",
        earned: streak >= 3,
        icon: IconFlame,
      },
    ];
  }, [attempts, streak]);

  const earnedCount = badges.filter((b) => b.earned).length;

  // ── Section breakdown ───────────────────────────────────────────────────
  const bySection = useMemo(() => {
    const map = new Map<
      string,
      { count: number; avgAcc: number; avgScore: number; best: number }
    >();
    for (const a of attempts) {
      const key = a.section || "General";
      const prev = map.get(key) || { count: 0, avgAcc: 0, avgScore: 0, best: 0 };
      const count = prev.count + 1;
      map.set(key, {
        count,
        avgAcc: Math.round((prev.avgAcc * prev.count + (a.accuracy || 0)) / count),
        avgScore: Number(((prev.avgScore * prev.count + (a.score || 0)) / count).toFixed(1)),
        best: Math.max(prev.best, a.score || 0),
      });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [attempts]);

  // ── Last 7 Days Activity ────────────────────────────────────────────────
  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const start = d.getTime();
      const end = start + 86400000;
      const dayAttempts = attempts.filter((a) => a.date >= start && a.date < end);
      return {
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        count: dayAttempts.length,
        xp: dayAttempts.reduce((s, a) => s + xpFromAttempt(a), 0),
      };
    });
  }, [attempts]);

  const maxDayCount = Math.max(1, ...last7.map((d) => d.count));

  // ── Trend ───────────────────────────────────────────────────────────────
  const sorted = [...attempts].sort((a, b) => a.date - b.date);
  const recent5 = sorted.slice(-5);
  const prev5 = sorted.slice(-10, -5);
  const recentAvgAcc = recent5.length
    ? Math.round(recent5.reduce((s, a) => s + (a.accuracy || 0), 0) / recent5.length)
    : 0;
  const prevAvgAcc = prev5.length
    ? Math.round(prev5.reduce((s, a) => s + (a.accuracy || 0), 0) / prev5.length)
    : null;
  const trendDelta = prevAvgAcc !== null ? recentAvgAcc - prevAvgAcc : null;

  // ── Goals ───────────────────────────────────────────────────────────────
  const goals = [
    { id: "acc80", label: "Reach 80% Avg Accuracy", current: avgAccuracy, target: 80, unit: "%" },
    { id: "mocks10", label: "Complete 10 Mock Tests", current: totalAttempts, target: 10, unit: "" },
    { id: "streak7", label: "Maintain a 7-day Streak", current: streak, target: 7, unit: "d" },
    { id: "xp500", label: "Accumulate 500 XP", current: totalXp, target: 500, unit: " XP" },
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Navigation Bar */}
        <header className="mb-8 flex items-center justify-between border-b border-slate-200/80 pb-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <IconArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Local Synchronized
          </div>
        </header>

        {/* Hero Card */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <IconShield className="h-3.5 w-3.5" /> Candidate Tier
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
                Level {level} <span className="text-slate-400">·</span> {title}
              </h1>
              <p className="text-sm text-slate-300">
                {totalXp.toLocaleString()} Total XP earned across all evaluated attempts.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center backdrop-blur transition hover:bg-white/10">
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <IconFlame className="h-4 w-4" />
                  <span className="text-xl font-bold text-white">{streak}</span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Day Streak</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center backdrop-blur transition hover:bg-white/10">
                <div className="flex items-center justify-center gap-1 text-indigo-400">
                  <IconTarget className="h-4 w-4" />
                  <span className="text-xl font-bold text-white">{totalAttempts}</span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Mocks Taken</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center backdrop-blur transition hover:bg-white/10">
                <div className="flex items-center justify-center gap-1 text-emerald-400">
                  <IconTrophy className="h-4 w-4" />
                  <span className="text-xl font-bold text-white">{avgAccuracy}%</span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Avg Accuracy</p>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Level {level} Progress</span>
              <span className="text-amber-400">{xpIntoLevel} / {XP_PER_LEVEL} XP</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-indigo-400 transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>{XP_PER_LEVEL - xpIntoLevel} XP required for Next Level</span>
              <span className="font-semibold text-slate-300">{Math.round(xpProgress)}%</span>
            </div>
          </div>
        </section>

        {totalAttempts === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <IconSparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">No Assessment Data Yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Complete your first mock examination to start earning XP, unlocking achievements, and tracking analytics.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Start First Mock
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* KPI Cards */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Best Score" value={String(bestScore)} trend="Personal Best" />
              <StatCard label="Peak Accuracy" value={`${bestAccuracy}%`} trend="Record Peak" />
              <StatCard label="Average Score" value={String(avgScore)} trend="Per Exam" />
              <StatCard label="Total Experience" value={String(totalXp)} trend="All-time XP" />
            </section>

            {/* Goals & Badges */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Goals */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Milestones & Goals</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {goals.filter((g) => g.current >= g.target).length}/{goals.length} Done
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {goals.map((g) => {
                    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
                    const done = g.current >= g.target;
                    return (
                      <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:bg-slate-50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{g.label}</span>
                          {done ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                              <IconCheck className="h-3 w-3" /> Completed
                            </span>
                          ) : (
                            <span className="font-medium text-slate-500">
                              {g.current}{g.unit} / {g.target}{g.unit}
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              done ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Achievements */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">Earned Badges</h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {earnedCount} of {badges.length} Unlocked
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {badges.map((b) => {
                    const IconComponent = b.earned ? b.icon : IconLock;
                    return (
                      <div
                        key={b.id}
                        className={`group relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                          b.earned
                            ? "border-amber-200/70 bg-gradient-to-b from-amber-50/40 to-white shadow-sm hover:border-amber-300"
                            : "border-slate-150 bg-slate-50/50 opacity-60"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition duration-300 group-hover:scale-105 ${
                            b.earned ? "bg-amber-100/70 text-amber-600" : "bg-slate-200/60 text-slate-400"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <p className="mt-2.5 text-xs font-semibold text-slate-900">{b.name}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-500">{b.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Analytics: 7-day Activity & Accuracy Trends */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Accuracy Trend</h3>
                    <p className="text-xs text-slate-500">Comparing last 5 attempts vs previous 5</p>
                  </div>
                  {trendDelta !== null && (
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        trendDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {trendDelta >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                      {Math.abs(trendDelta)}%
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900">{recentAvgAcc}%</span>
                  <span className="text-xs font-medium text-slate-500">Recent Average Accuracy</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <span className="text-base font-bold text-emerald-600">{totalCorrect}</span>
                    <p className="text-[11px] font-medium text-slate-500">Total Correct</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <span className="text-base font-bold text-rose-600">{totalWrong}</span>
                    <p className="text-[11px] font-medium text-slate-500">Total Missed</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <span className="text-base font-bold text-slate-700">{totalAttemptedQs}</span>
                    <p className="text-[11px] font-medium text-slate-500">Total Attempted</p>
                  </div>
                </div>
              </section>

              {/* 7-Day Activity Chart */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Activity Breakdown</h3>
                    <p className="text-xs text-slate-500">Attempts and XP distribution over 7 days</p>
                  </div>
                </div>

                <div className="mt-6 flex h-36 items-end gap-2.5 pt-4">
                  {last7.map((day) => {
                    const heightPercent = day.count ? Math.round((day.count / maxDayCount) * 100) : 8;
                    return (
                      <div key={day.label} className="group relative flex flex-1 flex-col items-center gap-2">
                        {/* Interactive Tooltip */}
                        <div className="pointer-events-none absolute -top-8 z-20 hidden -translate-y-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-md transition-all group-hover:block">
                          {day.count} mocks · {day.xp} XP
                        </div>
                        <div className="relative flex h-24 w-full items-end rounded-lg bg-slate-100 p-1">
                          <div
                            className={`w-full rounded-md transition-all duration-300 ${
                              day.count > 0
                                ? "bg-indigo-600 group-hover:bg-indigo-500"
                                : "bg-slate-200/60"
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Section Breakdown Grid */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Section Analysis</h2>
              <p className="text-xs text-slate-500">Track subject-wise proficiency and identify areas needing improvement</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bySection.map(([name, data]) => {
                  const toneColor =
                    data.avgAcc >= 80
                      ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                      : data.avgAcc >= 60
                        ? "text-amber-700 bg-amber-50 border-amber-100"
                        : "text-rose-700 bg-rose-50 border-rose-100";

                  return (
                    <div key={name} className="rounded-xl border border-slate-200/80 p-4 transition hover:border-slate-300 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">{name}</h4>
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${toneColor}`}>
                          {data.avgAcc}%
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{data.count}</p>
                          <p className="text-[11px] text-slate-400">Tests</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{data.avgScore}</p>
                          <p className="text-[11px] text-slate-400">Avg</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{data.best}</p>
                          <p className="text-[11px] text-slate-400">Best</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Mission Log / History */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Evaluation History</h2>
                  <p className="text-xs text-slate-500">Select any completed mock test to inspect breakdown</p>
                </div>
                <select
                  aria-label="Filter by section"
                  value={filterSection}
                  onChange={(e) => {
                    setFilterSection(e.target.value);
                    setSelectedId(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Sections" : s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
                {/* Scrollable List */}
                <div className="max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
                  {filtered.map((a) => {
                    const active = selected?.id === a.id;
                    const xp = xpFromAttempt(a);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`w-full rounded-xl p-3.5 text-left transition ${
                          active
                            ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border border-transparent bg-slate-50/70 text-slate-700 hover:border-slate-200 hover:bg-slate-100/60"
                        }`}
                      >
                        <p className={`truncate text-xs font-bold ${active ? "text-white" : "text-slate-900"}`}>
                          {a.title}
                        </p>
                        <div className={`mt-1 flex items-center justify-between text-[11px] ${active ? "text-slate-300" : "text-slate-500"}`}>
                          <span>{formatDate(a.date)}</span>
                          <span className="font-semibold text-amber-400">+{xp} XP</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Details Panel */}
                {selected ? (
                  <div className="rounded-xl border border-slate-150 bg-slate-50/40 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{selected.title}</h3>
                        <p className="text-xs font-medium text-slate-500">
                          {selected.section} <span className="text-slate-300">·</span> {formatDate(selected.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          +{xpFromAttempt(selected)} XP
                        </span>
                        <Link
                          href={`/result/${encodeURIComponent(selected.id)}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          View Full Breakdown →
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MiniStat label="Score" value={`${selected.score}/${selected.total}`} />
                      <MiniStat label="Accuracy" value={`${selected.accuracy}%`} />
                      <MiniStat label="Time Taken" value={formatDuration(selected.durationSeconds || 0)} />
                      <MiniStat label="Answering Pace" value={`${selected.speed ?? "—"}/min`} />
                    </div>

                    {/* Proportional Segment Bar */}
                    <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-4">
                      <p className="text-xs font-bold text-slate-700">Question Accuracy Composition</p>
                      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                        {selected.total > 0 && (
                          <>
                            <div className="bg-emerald-500 transition-all" style={{ width: `${(selected.correct / selected.total) * 100}%` }} />
                            <div className="bg-rose-500 transition-all" style={{ width: `${(selected.wrong / selected.total) * 100}%` }} />
                            <div className="bg-slate-300 transition-all" style={{ width: `${((selected.unanswered ?? selected.total - selected.attempted) / selected.total) * 100}%` }} />
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Correct: {selected.correct}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Wrong: {selected.wrong}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          Skipped: {selected.unanswered ?? Math.max(0, selected.total - selected.attempted)}
                        </span>
                      </div>
                    </div>

                    {/* AI / System Coach Feedback */}
                    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
                        <IconSparkles className="h-3.5 w-3.5" /> Assessment Feedback
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                        {buildInsight(selected, bestAccuracy, avgAccuracy)}
                      </p>
                    </div>

                    {selected.paperId && (
                      <div className="mt-5 flex gap-2">
                        <Link
                          href={`/exam/${encodeURIComponent(selected.paperId)}`}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                          Retake Paper
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-xs font-medium text-slate-400">
                    Select an attempt to inspect details
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <span className="mt-1 inline-block text-[10px] font-semibold text-slate-400">{trend}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function buildInsight(
  a: AttemptRecord,
  bestAccuracy: number,
  avgAccuracy: number
): string {
  const skipped = a.unanswered ?? Math.max(0, a.total - a.attempted);
  const parts: string[] = [];

  if (a.accuracy >= 90) {
    parts.push("Outstanding run! Maintain this accuracy under tighter time constraints.");
  } else if (a.accuracy >= 80) {
    parts.push("High performance. Prioritize eliminating non-essential mistakes.");
  } else if (a.accuracy >= 60) {
    parts.push("Moderate score. Spend time addressing the specific concept mistakes.");
  } else {
    parts.push("Sub-target accuracy. Review foundational topics before attempting another full test.");
  }

  if (skipped > a.total * 0.2) {
    parts.push(`High skip count (${skipped}). Target faster question triage on easier items.`);
  } else if (a.wrong > a.correct) {
    parts.push("Negative marks detected from guesses. Limit speculative attempts.");
  }

  if (a.accuracy === bestAccuracy && a.accuracy > 0) {
    parts.push("Personal best recorded.");
  } else if (a.accuracy < avgAccuracy - 10) {
    parts.push("Below recent historical average.");
  }

  const xp = xpFromAttempt(a);
  parts.push(`Awarded +${xp} XP.`);

  return parts.join(" ");
}