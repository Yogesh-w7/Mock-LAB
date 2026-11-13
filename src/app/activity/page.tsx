"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/app-shell";
import { EmptyState, PageHeading } from "@/components/page-ui";

import {
  ATTEMPTS_KEY,
  readStorage,
  type AttemptRecord,
} from "@/lib/bankprep-data";

// --- Interactive Icon Components ---
function IconCheckCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCrosshair({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
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

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconSparkles({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number = 0) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ActivityPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [selectedSection, setSelectedSection] = useState("All");

  useEffect(() => {
    function load() {
      setAttempts(readStorage<AttemptRecord>(ATTEMPTS_KEY));
    }

    load();
    window.addEventListener("focus", load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const totalAttempts = attempts.length;

  const accuracy = totalAttempts
    ? Math.round(
        attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalAttempts
      )
    : 0;

  const bestScore = totalAttempts
    ? Math.max(...attempts.map((a) => a.score || 0))
    : 0;

  const attemptedQuestions = attempts.reduce(
    (sum, a) => sum + (a.attempted || 0),
    0
  );

  const sections = useMemo(() => {
    const set = new Set(attempts.map((a) => a.section).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [attempts]);

  const filtered = useMemo(() => {
    const list =
      selectedSection === "All"
        ? attempts
        : attempts.filter((a) => a.section === selectedSection);
    return [...list].sort((a, b) => b.date - a.date);
  }, [attempts, selectedSection]);

  return (
    <AppShell active="/">
      <div className="space-y-8 pb-12">
        <PageHeading
          eyebrow="Practice history"
          title="Recent Activity"
          description="Review previous mock attempts, inspect granular section metrics, and track progress over time."
        />

        {/* Top Highlight Metric Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Tests Completed"
            value={totalAttempts.toString()}
            note="All recorded attempts"
            icon={IconCheckCircle}
            variant="blue"
          />

          <StatCard
            label="Average Accuracy"
            value={`${accuracy}%`}
            note="Across all questions answered"
            icon={IconCrosshair}
            variant="emerald"
          />

          <StatCard
            label="Personal Best"
            value={bestScore.toString()}
            note={`${attemptedQuestions} total questions attempted`}
            icon={IconTrophy}
            variant="amber"
          />
        </section>

        {filtered.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Header with Section Filtering */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Completed Mock Papers
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {filtered.length} recorded {filtered.length === 1 ? "attempt" : "attempts"}
                </p>
              </div>

              {sections.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Filter:</span>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    {sections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec === "All" ? "All Sections" : sec}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List Rows */}
            <div className="divide-y divide-slate-100">
              {filtered.map((attempt) => (
                <EnhancedAttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            title="No test history yet"
            description="Complete a mock test and your diagnostic score, speed, and accuracy will appear here."
            href="/library"
            action="Choose a mock test"
          />
        )}
      </div>
    </AppShell>
  );
}

// --- Component: Polished Interactive Stat Card ---
function StatCard({
  label,
  value,
  note,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "blue" | "emerald" | "amber";
}) {
  const colorMap = {
    blue: {
      bg: "bg-indigo-50/70 text-indigo-600 border-indigo-100",
      accent: "group-hover:border-indigo-200",
    },
    emerald: {
      bg: "bg-emerald-50/70 text-emerald-600 border-emerald-100",
      accent: "group-hover:border-emerald-200",
    },
    amber: {
      bg: "bg-amber-50/70 text-amber-600 border-amber-100",
      accent: "group-hover:border-amber-200",
    },
  }[variant];

  return (
    <div className={`group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md ${colorMap.accent}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border transition group-hover:scale-105 ${colorMap.bg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{note}</p>
    </div>
  );
}

// --- Component: Upgraded Attempt Row ---
function EnhancedAttemptRow({ attempt }: { attempt: AttemptRecord }) {
  const accuracy = attempt.accuracy || 0;
  const isHighAcc = accuracy >= 80;
  const isMedAcc = accuracy >= 60 && accuracy < 80;

  const badgeTone = isHighAcc
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isMedAcc
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="group relative flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center">
      {/* Title & Time Info */}
      <div className="space-y-1 sm:max-w-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
            {attempt.title}
          </span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {attempt.section || "Full Mock"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{formatDate(attempt.date)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <IconClock className="h-3 w-3" />
            {formatDuration(attempt.durationSeconds)}
          </span>
          {attempt.speed && (
            <>
              <span>·</span>
              <span>{attempt.speed}/min</span>
            </>
          )}
        </div>
      </div>

      {/* Metrics, Mini Visualizer & Action CTA */}
      <div className="flex flex-wrap items-center gap-5 sm:justify-end">
        {/* Answer Breakdown Strip */}
        <div className="hidden sm:block text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-700">
            <span>{attempt.score}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400">{attempt.total}</span>
          </div>

          <div className="mt-1 flex h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            {attempt.total > 0 && (
              <>
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(attempt.correct / attempt.total) * 100}%` }}
                />
                <div
                  className="bg-rose-500"
                  style={{ width: `${(attempt.wrong / attempt.total) * 100}%` }}
                />
                <div
                  className="bg-slate-300"
                  style={{
                    width: `${((attempt.unanswered ?? attempt.total - attempt.attempted) / attempt.total) * 100}%`,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Accuracy Badge */}
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeTone}`}>
          {accuracy}%
        </span>

        {/* Action Link */}
        <Link
          href={`/result/${encodeURIComponent(attempt.id)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100/60 hover:text-slate-900 group-hover:border-indigo-200"
        >
          Analysis
          <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}