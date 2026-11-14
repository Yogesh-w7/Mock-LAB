"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: unknown[];
  created_at?: string;
  is_published?: boolean;
};

type AttemptRecord = {
  id: string;
  title: string;
  section: string;
  date: number;
  score: number;
  correct: number;
  wrong: number;
  attempted: number;
  total: number;
  accuracy: number;
};

type UserProfile = {
  displayName: string;
  targetExam: string;
  avatarHue?: number;
};

type ActivePage =
  | "dashboard"
  | "exams"
  | "library"
  | "performance"
  | "profile"
  | "subjects";

const ATTEMPTS_KEY = "ibps-mock-attempt-history-v1";
const PROFILE_KEY = "ibps-mock-user-profile-v1";

function readList<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readProfile(): UserProfile | null {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    return value?.displayName ? value : null;
  } catch {
    return null;
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

// --- Inline SVGs & Micro-Icons ---

function IconGraduationCap({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l9-5-9-5-9 5 9 5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14v7"
      />
    </svg>
  );
}

function IconLayoutGrid({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconBookOpen({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function IconCompass({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IconTrendingUp({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function IconUser({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function IconShield({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function IconPlus({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function IconArrowRight({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function IconSparkles({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function IconLogOut({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

function IconTarget({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function IconTrophy({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 21h8m-4-4v4M5 4h14a2 2 0 012 2v2a7 7 0 01-7 7h0a7 7 0 01-7-7V6a2 2 0 012-2zm-2 2H2a2 2 0 00-2 2v1a4 4 0 004 4h1m14-7h1a2 2 0 012 2v1a4 4 0 01-4 4h-1"
      />
    </svg>
  );
}

function IconLayers({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );
}

// ============================================================
// Dashboard
// Papers are loaded from Supabase.
// Attempt history and the custom profile remain in localStorage.
// ============================================================

export default function HomePage() {
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [papersLoading, setPapersLoading] = useState(true);
  const [papersError, setPapersError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

async function loadDashboard() {
  if (!mounted) return;

  setPapersLoading(true);
  setPapersError(null);

  // Keep the existing local attempt history and candidate profile.
  try {
    setAttempts(readList<AttemptRecord>(ATTEMPTS_KEY));
    setProfile(readProfile());
  } catch (error) {
    console.error("Could not load local dashboard data:", error);
  }

  try {
    // Check whether a session exists before requesting the user.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    let user = null;

    if (session?.user) {
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      user = authenticatedUser;
    }

    let isAdmin = false;

    if (user) {
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      isAdmin = userProfile?.role === "admin";
    }

    // Admins can request all papers.
    // Visitors and students can request published papers only.
    let query = supabase
      .from("papers")
      .select(
        "id, title, section, minutes, questions, created_at, is_published"
      )
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("is_published", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!mounted) return;

    const normalizedPapers: SavedPaper[] = (data || []).map((paper) => ({
      id: String(paper.id),
      title: paper.title || "Untitled Paper",
      section: paper.section || "General",
      minutes: Number(paper.minutes) || 0,
      questions: Array.isArray(paper.questions) ? paper.questions : [],
      created_at: paper.created_at,
      is_published: Boolean(paper.is_published),
    }));

    setPapers(normalizedPapers);
  } catch (error) {
    console.error("Dashboard Supabase load failed:", error);

    if (mounted) {
      setPapers([]);

      setPapersError(
        error instanceof Error
          ? error.message
          : "Could not load papers from Supabase."
      );
    }
  } finally {
    if (mounted) {
      setPapersLoading(false);
    }
  }
}

    void loadDashboard();

    // Refresh dashboard when the user's authentication changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadDashboard();
    });

    // Attempt history and profile are still local.
    const reloadLocalData = () => {
      try {
        setAttempts(readList<AttemptRecord>(ATTEMPTS_KEY));
        setProfile(readProfile());
      } catch (error) {
        console.error("Could not refresh local dashboard data:", error);
      }

      void loadDashboard();
    };

    window.addEventListener("focus", reloadLocalData);
    window.addEventListener("storage", reloadLocalData);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", reloadLocalData);
      window.removeEventListener("storage", reloadLocalData);
    };
  }, []);

  const totalQuestions = useMemo(
    () =>
      papers.reduce(
        (sum, paper) => sum + paper.questions.length,
        0
      ),
    [papers]
  );

  const averageAccuracy = attempts.length
    ? Math.round(
        attempts.reduce(
          (sum, attempt) => sum + (attempt.accuracy || 0),
          0
        ) / attempts.length
      )
    : 0;

  const bestScore = attempts.length
    ? Math.max(...attempts.map((attempt) => attempt.score || 0))
    : 0;

  const recent = useMemo(
    () =>
      [...attempts]
        .sort((a, b) => b.date - a.date)
        .slice(0, 5),
    [attempts]
  );

  const displayName = profile?.displayName?.trim() || "Candidate";
  const firstName = displayName.split(" ")[0] || "Candidate";

  return (
    <Shell profile={profile} active="dashboard">
      <div className="space-y-8 pb-12 antialiased">
        {/* Workspace Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <IconSparkles className="h-3.5 w-3.5" />
                <span>Active Preparation Suite</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Welcome back, {firstName}
              </h1>

              <p className="max-w-xl text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
                Target high percentiles in IBPS PO/Clerk, SBI, RRB, and RBI
                exams with timed mocks, performance tracking, and granular
                answer keys.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/library"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
              >
                <IconBookOpen className="h-4 w-4" />
                <span>Practice Mocks</span>
              </Link>

              <Link
                href="/performance"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/10"
              >
                <IconTrendingUp className="h-4 w-4" />
                <span>Analytics</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Aggregate KPI Grid */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Library Papers"
            value={papersLoading ? "…" : String(papers.length)}
            hint={
              papersLoading
                ? "Syncing with Supabase"
                : "Synced from Supabase"
            }
            icon={IconLayers}
            variant="slate"
          />

          <StatCard
            label="Question Pool"
            value={totalQuestions.toLocaleString()}
            hint={papersLoading ? "Calculating…" : "Available questions"}
            icon={IconBookOpen}
            variant="indigo"
          />

          <StatCard
            label="Completed Mocks"
            value={String(attempts.length)}
            hint="Stored on this device"
            icon={IconTrophy}
            variant="emerald"
          />

          <StatCard
            label="Average Accuracy"
            value={`${averageAccuracy}%`}
            hint={
              attempts.length
                ? `Best Score: ${bestScore}`
                : "No attempts logged"
            }
            icon={IconTarget}
            variant="amber"
          />
        </section>

        {/* Supabase error */}
        {papersError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
          >
            <p className="font-bold">
              Could not sync papers from Supabase
            </p>

            <p className="mt-1 break-words">{papersError}</p>

            <p className="mt-1 text-rose-600">
              Check the papers table columns, authentication, and Row Level
              Security policies.
            </p>
          </div>
        )}

        {/* Feature Tracks */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Target Curriculum Modules
            </h2>
            <p className="text-xs text-slate-500">
              Select an assessment module to focus your preparation
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <QuickCard
              href="/library"
              title="Practice Repository"
              desc="Full-length exam simulations and sectional sets with timed timers."
              icon={IconBookOpen}
              accent="indigo"
            />

            <QuickCard
              href="/exams"
              title="Banking Tracks"
              desc="Specialized collections tailored for IBPS, RRB, SBI, and RBI syllabus."
              icon={IconCompass}
              accent="emerald"
            />

            <QuickCard
              href="/performance"
              title="Accuracy Analytics"
              desc="Track speed-accuracy trade-offs, XP levels, and sectional strengths."
              icon={IconTrendingUp}
              accent="amber"
            />
          </div>
        </section>

        {/* Recent Attempts History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                Recent Evaluations
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of your last 5 practice sessions
              </p>
            </div>

            <Link
              href="/performance"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 transition hover:text-slate-900"
            >
              <span>View Full History</span>
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {recent.length ? (
              <ul className="divide-y divide-slate-100">
                {recent.map((attempt) => (
                  <li key={attempt.id}>
                    <Link
                      href={`/result/${encodeURIComponent(attempt.id)}`}
                      className="group flex flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-slate-50/80 sm:px-6"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-900 transition group-hover:text-indigo-600 sm:text-sm">
                            {attempt.title}
                          </p>

                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {attempt.section}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-slate-400">
                          Completed {formatDate(attempt.date)}
                        </p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-mono text-xs font-bold text-slate-900 sm:text-sm">
                            {attempt.score}/{attempt.total}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Score
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-bold ${
                              attempt.accuracy >= 80
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : attempt.accuracy >= 60
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                          >
                            {attempt.accuracy}%
                          </span>

                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Accuracy
                          </p>
                        </div>

                        <IconArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700 sm:block" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <IconBookOpen className="h-6 w-6" />
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  No Assessment Records Yet
                </h3>

                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Start practicing from the catalog to see score analytics.
                </p>

                <Link
                  href="/library"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  <span>Take First Mock</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

// ============================================================
// StatCard
// ============================================================

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "indigo" | "emerald" | "amber" | "slate";
}) {
  const styles = {
    indigo: "border-indigo-100 bg-indigo-50/70 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    slate: "border-slate-100 bg-slate-100/70 text-slate-700",
  }[variant];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl border ${styles}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>

      {hint && (
        <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>
      )}
    </div>
  );
}

// ============================================================
// QuickCard
// ============================================================

function QuickCard({
  href,
  title,
  desc,
  icon: Icon,
  accent,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "indigo" | "emerald" | "amber";
}) {
  const styles = {
    indigo:
      "border-indigo-100 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
    emerald:
      "border-emerald-100 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
    amber:
      "border-amber-100 bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white",
  }[accent];

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-200 ${styles}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-900 transition group-hover:text-indigo-600">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {desc}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-indigo-600">
        <span>Access Track</span>
        <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

// ============================================================
// Core Shell Layout
// ============================================================

function Shell({
  children,
  profile,
  active,
}: {
  children: React.ReactNode;
  profile: UserProfile | null;
  active: ActivePage;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authDisplayName, setAuthDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    
    async function checkUser() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (!mounted) return;
        if (sessionError || !session?.user) {
          setLoggedIn(false);
          setIsAdmin(false);
          setAuthDisplayName(null);
          return;
          
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          
          if (!mounted) return;
          
          if (userError || !user) {
            setLoggedIn(false);
            setIsAdmin(false);
            setAuthDisplayName(null);
            return;
          }
          
          setLoggedIn(true);
          const metadataName =
            user.user_metadata?.display_name ||
            user.user_metadata?.full_name ||
            null;
          
          setAuthDisplayName(metadataName);
          const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          
          if (!mounted) return;
          
          setIsAdmin(!profileError && userProfile?.role === "admin");
        } catch (error) {
        console.error("Authentication check failed:", error);
        
        if (mounted) {
          setLoggedIn(false);
          setIsAdmin(false);
          setAuthDisplayName(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    void checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      window.alert("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const resolvedName = useMemo(() => {
    return (
      authDisplayName?.trim() ||
      profile?.displayName?.trim() ||
      "Candidate"
    );
  }, [authDisplayName, profile]);

  const initials = useMemo(() => {
    return resolvedName
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [resolvedName]);

  function navItem(
    href: string,
    key: ActivePage,
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) {
    const isActive = active === key;

    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
          isActive
            ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        }`}
      >
        <Icon
          className={`h-4 w-4 ${
            isActive ? "text-white" : "text-slate-400"
          }`}
        />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/60 text-slate-900 antialiased">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
          {/* Logo Header */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-950/20">
              <IconGraduationCap className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-extrabold tracking-tight text-slate-950">
                MockLAB
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                IBPS Practice Core
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-1 flex-col gap-1.5 p-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Navigation
            </p>

            {navItem("/", "dashboard", "Dashboard", IconLayoutGrid)}
            {navItem("/exams", "exams", "Banking Exams", IconCompass)}
            {navItem("/library", "library", "Mock Library", IconBookOpen)}
            {navItem(
              "/performance",
              "performance",
              "Analytics",
              IconTrendingUp
            )}
            {navItem("/profile", "profile", "Profile", IconUser)}

            {!authLoading && isAdmin && (
              <>
                <div className="my-3 border-t border-slate-100" />

                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Administration
                </p>

                <Link
                  href="/admin/papers"
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  <IconShield className="h-4 w-4 text-indigo-600" />
                  <span>Manage Papers</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Account Strip */}
          <div className="border-t border-slate-100 p-4">
            {profile || loggedIn ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <Link href="/profile" className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-extrabold text-white shadow-sm">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {resolvedName}
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-400">
                      {profile?.targetExam || "Aspirant"}
                    </p>
                  </div>
                </Link>

                {loggedIn && (
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <IconLogOut className="h-3 w-3" />
                    <span>
                      {signingOut ? "Signing out…" : "Sign out"}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className="rounded-xl bg-slate-900 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
              {/* Mobile Identity */}
              <Link
                href="/"
                className="flex items-center gap-2 lg:hidden"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <IconGraduationCap className="h-4 w-4" />
                </div>
                <span className="text-sm font-extrabold tracking-tight text-slate-950">
                  MockLAB
                </span>
              </Link>

              {/* Candidate Salutation */}
              <div className="hidden items-center gap-2 lg:flex">
                <span className="text-xs font-medium text-slate-400">
                  Welcome,
                </span>

                <span className="text-xs font-bold text-slate-900">
                  {resolvedName}
                </span>

                {profile?.targetExam && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {profile.targetExam}
                  </span>
                )}
              </div>

              {/* Header Links & Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/library"
                  className="rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Library
                </Link>

                <Link
                  href="/performance"
                  className="rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Performance
                </Link>

                {!authLoading && isAdmin && (
                  <Link
                    href="/admin/papers"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <IconShield className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </Link>
                )}

                {!authLoading && !loggedIn && (
                  <Link
                    href="/login"
                    className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Child Page Container */}
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

export { Shell };
