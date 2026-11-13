"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readProfile,
  upsertProfile,
  type UserProfile,
} from "@/lib/profile";

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

const EXAMS = [
  "IBPS PO",
  "IBPS Clerk",
  "RRB PO",
  "RRB Assistant",
  "SBI PO",
  "SBI Clerk",
  "RBI Assistant",
  "Other",
];

function readAttempts(): AttemptRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
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

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

// --- Inline SVGs & Micro-Icons ---
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconFlame({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.9z" />
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

function IconTrendingUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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

function IconTrophy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4M5 4h14a2 2 0 012 2v2a7 7 0 01-7 7h0a7 7 0 01-7-7V6a2 2 0 012-2zm-2 2H2a2 2 0 00-2 2v1a4 4 0 004 4h1m14-7h1a2 2 0 012 2v1a4 4 0 01-4 4h-1" />
    </svg>
  );
}

function IconCheckCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconTarget({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [editing, setEditing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [exam, setExam] = useState("IBPS PO");
  const [targetScore, setTargetScore] = useState(60);
  const [dailyMinutes, setDailyMinutes] = useState(60);

  useEffect(() => {
    const p = readProfile();
    setProfile(p);
    if (p) {
      setName(p.displayName);
      setExam(p.targetExam);
      setTargetScore(p.targetScore);
      setDailyMinutes(p.dailyGoalMinutes);
    } else {
      setEditing(true);
    }
    setAttempts(readAttempts());
  }, []);

  function saveProfile() {
    const next = upsertProfile({
      displayName: name || "Aspirant",
      targetExam: exam,
      targetScore,
      dailyGoalMinutes: dailyMinutes,
      avatarHue: profile?.avatarHue,
    });
    setProfile(next);
    setEditing(false);
  }

  // ── Metrics ─────────────────────────────────────────────────────────────
  const totalXp = attempts.reduce((s, a) => s + xpFromAttempt(a), 0);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInto = totalXp % XP_PER_LEVEL;
  const title = rankTitle(level);

  const totalAttempts = attempts.length;
  const avgAccuracy = totalAttempts
    ? Math.round(
        attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / totalAttempts
      )
    : 0;
  const avgScore = totalAttempts
    ? attempts.reduce((s, a) => s + (a.score || 0), 0) / totalAttempts
    : 0;
  const bestScore = totalAttempts
    ? Math.max(...attempts.map((a) => a.score || 0))
    : 0;
  const bestAccuracy = totalAttempts
    ? Math.max(...attempts.map((a) => a.accuracy || 0))
    : 0;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrong || 0), 0);
  const totalMinutes = Math.round(
    attempts.reduce((s, a) => s + (a.durationSeconds || 0), 0) / 60
  );

  // Streak
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

  // Accuracy over last 12 attempts
  const recentForChart = useMemo(() => {
    return [...attempts]
      .sort((a, b) => a.date - b.date)
      .slice(-12)
      .map((a) => ({
        acc: a.accuracy || 0,
        score: a.score || 0,
        date: a.date,
        label: formatDate(a.date),
      }));
  }, [attempts]);

  const scoreHistory = recentForChart;

  // Section analysis
  const bySection = useMemo(() => {
    const map = new Map<string, { acc: number[]; scores: number[] }>();
    for (const a of attempts) {
      const key = a.section || "Other";
      const prev = map.get(key) || { acc: [], scores: [] };
      prev.acc.push(a.accuracy || 0);
      prev.scores.push(a.score || 0);
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        avgAcc: Math.round(d.acc.reduce((s, x) => s + x, 0) / d.acc.length),
        avgScore: Number(
          (d.scores.reduce((s, x) => s + x, 0) / d.scores.length).toFixed(1)
        ),
        count: d.acc.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [attempts]);

  // Last 14 days activity
  const last14 = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      const start = d.getTime();
      const end = start + 86400000;
      const day = attempts.filter((a) => a.date >= start && a.date < end);
      return {
        label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        count: day.length,
        minutes: Math.round(
          day.reduce((s, a) => s + (a.durationSeconds || 0), 0) / 60
        ),
        xp: day.reduce((s, a) => s + xpFromAttempt(a), 0),
      };
    });
  }, [attempts]);

  const maxDayXp = Math.max(1, ...last14.map((d) => d.xp));

  // Target progress
  const targetProgress =
    profile && profile.targetScore > 0
      ? Math.min(100, Math.round((avgScore / profile.targetScore) * 100))
      : 0;

  const initials = (profile?.displayName || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Navigation Bar */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <IconArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/performance"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <IconTrendingUp className="h-3.5 w-3.5 text-indigo-600" />
              <span>Full Analytics</span>
            </Link>

            {!editing && profile && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <IconEdit className="h-3.5 w-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Edit / Setup Form ─────────────────────────────────────────── */}
        {editing && (
          <section className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {profile ? "Candidate Profile Configuration" : "Initialize Candidate Account"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Target milestones and exam preferences are saved locally to this workstation.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Candidate Display Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Primary Target Exam
                </span>
                <select
                  value={exam}
                  onChange={(e) => setExam(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  {EXAMS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Benchmark Score Goal
                </span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={targetScore}
                  onChange={(e) =>
                    setTargetScore(
                      Math.min(200, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>

              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Target Daily Study Schedule (Minutes)
                </span>
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={dailyMinutes}
                  onChange={(e) =>
                    setDailyMinutes(
                      Math.min(480, Math.max(10, Number(e.target.value) || 10))
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </label>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={saveProfile}
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-slate-950/10 transition hover:bg-slate-800"
              >
                {profile ? "Save Preferences" : "Create Candidate Account"}
              </button>

              {profile && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Profile Hero Header ───────────────────────────────────────── */}
        {profile && !editing && (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-lg ring-2 ring-white/10"
                    style={{
                      background: `linear-gradient(135deg, hsl(${profile.avatarHue || 240} 70% 45%), hsl(${((profile.avatarHue || 240) + 40) % 360} 70% 35%))`,
                    }}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      {profile.targetExam} Aspirant
                    </span>
                    <h1 className="truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                      {profile.displayName}
                    </h1>
                    <p className="text-xs font-medium text-slate-300">
                      Level {level} <span className="text-slate-500">·</span> {title}{" "}
                      <span className="text-slate-500">·</span> {totalXp.toLocaleString()} Total XP
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <Pill label="Day Streak" value={`${streak}d`} icon={IconFlame} accent="text-amber-400" />
                  <Pill label="Completed" value={String(totalAttempts)} icon={IconCheckCircle} accent="text-indigo-400" />
                  <Pill label="Avg Accuracy" value={`${avgAccuracy}%`} icon={IconTarget} accent="text-emerald-400" />
                </div>
              </div>

              {/* Level Progress Bar */}
              <div className="relative z-10 mt-7 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Tier {level} Progress</span>
                  <span className="text-amber-300">
                    {xpInto} / {XP_PER_LEVEL} XP
                  </span>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-indigo-400 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, (xpInto / XP_PER_LEVEL) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {XP_PER_LEVEL - xpInto} XP needed to reach Level {level + 1}
                </p>
              </div>
            </section>

            {/* Target vs Average Score KPI Cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Target Score
                </span>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {profile.targetScore}
                </p>
                <p className="mt-1 text-xs text-slate-500">Benchmark for {profile.targetExam}</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Realized Average
                </span>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {avgScore.toFixed(1)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Across {totalAttempts} registered tests</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Goal Completion
                  </span>
                  <span className="text-xs font-bold text-slate-700">{targetProgress}%</span>
                </div>
                <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {targetProgress}%
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      targetProgress >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${targetProgress}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Secondary KPIs */}
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Best Score" value={String(bestScore)} icon={IconTrophy} />
              <StatCard label="Peak Accuracy" value={`${bestAccuracy}%`} icon={IconTarget} />
              <StatCard label="Total Correct" value={String(totalCorrect)} icon={IconCheckCircle} />
              <StatCard label="Practice Time" value={`${totalMinutes}m`} icon={IconClock} />
            </section>

            {/* Accuracy Line Chart */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Accuracy Trajectory</h2>
                  <p className="text-xs text-slate-500">Historical performance across last {scoreHistory.length || 0} mocks</p>
                </div>
              </div>
              {scoreHistory.length >= 2 ? (
                <AccuracyChart data={scoreHistory} />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Complete at least 2 mock tests to activate accuracy trend visualization.
                </div>
              )}
            </section>

            {/* Score History & 14-day Heatmap */}
            <section className="grid gap-6 lg:grid-cols-2">
              {/* Score Bar Chart */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Score per Test</h2>
                  <p className="text-xs text-slate-500">Score distribution chronologically (recent on right)</p>
                </div>
                {scoreHistory.length ? (
                  <div className="mt-6 flex h-36 items-end gap-2 pt-2">
                    {scoreHistory.map((d, i) => {
                      const maxS = Math.max(1, ...scoreHistory.map((x) => x.score));
                      return (
                        <div
                          key={i}
                          className="group relative flex flex-1 flex-col items-center gap-1.5"
                          title={`${d.label}: ${d.score} marks`}
                        >
                          <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-800">
                            {d.score}
                          </span>
                          <div className="flex h-24 w-full items-end rounded-lg bg-slate-100 p-1">
                            <div
                              className="w-full rounded-md bg-indigo-600 transition-all duration-300 group-hover:bg-indigo-500"
                              style={{
                                height: `${Math.max(10, (d.score / maxS) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">No test attempts logged yet</div>
                )}
              </div>

              {/* 14-Day Activity Tracker */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">14-Day Velocity</h2>
                  <p className="text-xs text-slate-500">Daily study cadence and XP accumulation</p>
                </div>
                <div className="mt-6 flex h-36 items-end gap-1.5 pt-2">
                  {last14.map((d) => (
                    <div
                      key={d.label}
                      className="group relative flex flex-1 flex-col items-center gap-1.5"
                      title={`${d.label}: ${d.count} mocks, ${d.xp} XP`}
                    >
                      <div className="flex h-24 w-full items-end rounded-lg bg-slate-100 p-0.5">
                        <div
                          className={`w-full rounded-md transition-all duration-300 ${
                            d.xp > 0
                              ? "bg-slate-900 group-hover:bg-indigo-600"
                              : "bg-slate-200/50"
                          }`}
                          style={{
                            height: `${Math.max(d.xp ? 12 : 4, (d.xp / maxDayXp) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-800">
                        {d.short}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section Strength */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-bold text-slate-900">Sectional Competency</h2>
              <p className="text-xs text-slate-500">Average accuracy breakdown across paper topics</p>

              <div className="mt-5 space-y-3">
                {bySection.length === 0 && (
                  <p className="py-4 text-xs text-slate-400">No topic data available yet.</p>
                )}
                {bySection.map((s) => (
                  <div
                    key={s.name}
                    className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {s.count} mock{s.count === 1 ? "" : "s"} · Avg score {s.avgScore}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">{s.avgAcc}%</span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          s.avgAcc >= 80
                            ? "bg-emerald-500"
                            : s.avgAcc >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, s.avgAcc)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lifetime Summary & Today's Study Goal */}
            <section className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-bold text-slate-900">Question Accuracy Ratio</h2>
                <p className="text-xs text-slate-500">Lifetime split between correct and wrong responses</p>

                <div className="mt-6 flex items-center gap-6">
                  <Donut correct={totalCorrect} wrong={totalWrong} />
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-slate-700">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      Correct: <strong className="text-slate-900">{totalCorrect}</strong>
                    </p>
                    <p className="font-semibold text-slate-700">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-500" />
                      Wrong: <strong className="text-slate-900">{totalWrong}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">Evaluated on all recorded attempts</p>
                  </div>
                </div>
              </div>

              {/* Daily Target */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-bold text-slate-900">Today&apos;s Study Commitment</h2>
                <p className="text-xs text-slate-500">
                  Target pace: {profile.dailyGoalMinutes} minutes per day
                </p>

                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const todayMinutes = Math.round(
                    attempts
                      .filter((a) => a.date >= today.getTime())
                      .reduce((s, a) => s + (a.durationSeconds || 0), 0) / 60
                  );
                  const pct = Math.min(
                    100,
                    Math.round((todayMinutes / profile.dailyGoalMinutes) * 100)
                  );
                  const remaining = Math.max(0, profile.dailyGoalMinutes - todayMinutes);

                  return (
                    <div className="mt-5">
                      <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                        {todayMinutes}
                        <span className="text-base font-medium text-slate-400">
                          {" "}
                          / {profile.dailyGoalMinutes}m
                        </span>
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        {pct >= 100
                          ? "Daily practice goal achieved — well done."
                          : `${remaining} minutes remaining today`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </section>

            <p className="text-center text-[11px] font-medium text-slate-400">
              Candidate profile and test metrics persist in this local browser environment.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Pill({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur transition hover:bg-white/10">
      <div className={`flex items-center justify-center gap-1 ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-base font-extrabold text-white sm:text-lg">{value}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-medium text-slate-400">{label}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

function AccuracyChart({
  data,
}: {
  data: { acc: number; label: string }[];
}) {
  const w = 500;
  const h = 140;
  const pad = 12;
  const maxY = 100;
  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.acc / maxY) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = points.join(" ");

  return (
    <div className="mt-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-36 w-full min-w-[320px]"
        preserveAspectRatio="none"
      >
        {[0, 25, 50, 75, 100].map((v) => {
          const y = h - pad - (v / maxY) * (h - pad * 2);
          return (
            <line
              key={v}
              x1={pad}
              x2={w - pad}
              y1={y}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1.5"
            />
          );
        })}
        <polyline
          fill="none"
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
          const y = h - pad - (d.acc / maxY) * (h - pad * 2);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}

function Donut({ correct, wrong }: { correct: number; wrong: number }) {
  const total = correct + wrong || 1;
  const correctPct = (correct / total) * 100;

  return (
    <div
      className="h-20 w-20 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(#10b981 0% ${correctPct}%, #f43f5e ${correctPct}% 100%)`,
        mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 10px))",
        WebkitMask:
          "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 10px))",
      }}
    />
  );
}