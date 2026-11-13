"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  ATTEMPTS_KEY,
  PAPERS_KEY,
  readProfile,
  readStorage,
  type AttemptRecord,
  type SavedPaper,
  type UserProfile,
} from "@/lib/bankprep-data";

// --- Inline SVGs & Micro-Icons ---
function IconGraduationCap({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
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

function IconCompass({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IconBrain({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

function IconBookOpen({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
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

function IconUser({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Dashboard", icon: IconLayoutGrid },
  { href: "/exams", label: "Banking Exams", icon: IconCompass },
  { href: "/subjects", label: "Subject Practice", icon: IconBrain },
  { href: "/library", label: "Mock Library", icon: IconBookOpen },
  { href: "/performance", label: "Performance", icon: IconTrendingUp },
  { href: "/profile", label: "Profile", icon: IconUser },
];

export default function AppShell({
  children,
  active = "/",
}: {
  children: ReactNode;
  active?: string;
}) {
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    function loadData() {
      setPapers(readStorage<SavedPaper>(PAPERS_KEY));
      setAttempts(readStorage<AttemptRecord>(ATTEMPTS_KEY));
      setProfile(readProfile());
    }

    loadData();

    window.addEventListener("focus", loadData);
    window.addEventListener("storage", loadData);

    return () => {
      window.removeEventListener("focus", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  // Supabase Auth verification to display admin controls conditionally
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function checkRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted) {
          setIsAdmin(userProfile?.role === "admin");
        }
      } catch {
        if (isMounted) setIsAdmin(false);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    void checkRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = profile?.displayName?.trim() || "Candidate";
  const firstName = displayName.split(/\s+/)[0] || "Candidate";

  const initials = useMemo(() => {
    return displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white px-5 py-6 lg:flex">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-950/20">
            <IconGraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-sm font-extrabold tracking-tight text-slate-950">
              BankPrep
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Exam Workspace
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </p>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>

                {item.href === "/library" && papers.length > 0 && (
                  <span
                    className={`ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {papers.length}
                  </span>
                )}
              </Link>
            );
          })}

          {!authLoading && isAdmin && (
            <>
              <div className="my-3 border-t border-slate-100" />
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
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

        {/* Study Progress Card */}
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Saved Papers
            </span>
            <span className="font-mono text-xs font-bold text-slate-900">
              {papers.length}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{
                width: `${Math.min(100, (papers.length / 20) * 100)}%`,
              }}
            />
          </div>

          <p className="mt-2 text-[10px] font-medium text-slate-400">
            {attempts.length} {attempts.length === 1 ? "mock" : "mocks"} evaluated
          </p>
        </div>

        {/* Profile Footer Section */}
        <div className="mt-auto border-t border-slate-100 pt-4">
          <Link
            href="/profile"
            className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xs font-black text-white shadow-sm">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                {displayName}
              </span>
              <span className="block truncate text-[10px] font-medium text-slate-400">
                {profile?.targetExam || "Banking Aspirant"}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile Branding */}
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                <IconGraduationCap className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold tracking-tight text-slate-950">
                BankPrep
              </span>
            </Link>

            {/* Desktop Greeting */}
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-900">
                Welcome, {firstName}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                Prepare consistently. Track sectional accuracy every session.
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/performance"
                className="hidden rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
              >
                Analytics
              </Link>

              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-slate-950/10 transition hover:bg-slate-800"
              >
                <IconBookOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span>Practice Mocks</span>
              </Link>
            </div>
          </div>

          {/* Mobile Horizontal Navigation Strip */}
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden">
            {navItems.map((item) => {
              const isActive = active === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        {/* Content Pane */}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-4 py-5 text-[11px] font-medium text-slate-400 sm:px-6 lg:px-8">
          <span>BankPrep · High-Precision IBPS Preparation</span>
          <span>Practice • Review • Calibrate</span>
        </footer>
      </div>
    </div>
  );
}