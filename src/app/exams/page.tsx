"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "../page";

type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: { questionNumber: number }[];
  savedAt: number;
};

type UserProfile = {
  displayName: string;
  targetExam: string;
  avatarHue?: number;
};

const PAPERS_KEY = "ibps-mock-saved-papers-v1";
const PROFILE_KEY = "ibps-mock-user-profile-v1";

// --- Inline SVGs & Micro-Icons ---
function IconLandmark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" />
    </svg>
  );
}

function IconBuilding({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconAward({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="8" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function IconShieldCheck({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconBriefcase({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function IconLayers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

const exams = [
  {
    name: "IBPS PO",
    subtitle: "Probationary Officer",
    terms: ["ibps po", "probationary officer"],
    icon: IconAward,
    accent: "indigo",
  },
  {
    name: "IBPS Clerk",
    subtitle: "Customer Service Associate",
    terms: ["ibps clerk", "ibps customer service"],
    icon: IconBriefcase,
    accent: "blue",
  },
  {
    name: "RRB PO",
    subtitle: "Officer Scale I",
    terms: ["rrb po", "officer scale i", "regional rural bank po"],
    icon: IconShieldCheck,
    accent: "emerald",
  },
  {
    name: "RRB Assistant",
    subtitle: "Office Assistant",
    terms: ["rrb assistant", "office assistant", "rrb clerk"],
    icon: IconBuilding,
    accent: "amber",
  },
  {
    name: "SBI PO / Clerk",
    subtitle: "State Bank of India",
    terms: ["sbi po", "sbi clerk", "sbi"],
    icon: IconLandmark,
    accent: "sky",
  },
  {
    name: "RBI Exams",
    subtitle: "Assistant & Grade B",
    terms: ["rbi", "reserve bank"],
    icon: IconLayers,
    accent: "rose",
  },
];

function matchExam(paper: SavedPaper) {
  const v = `${paper.title} ${paper.section}`.toLowerCase();
  return exams.find((e) => e.terms.some((t) => v.includes(t)));
}

export default function ExamsPage() {
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PAPERS_KEY) || "[]");
      setPapers(Array.isArray(p) ? p : []);
      const pr = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      setProfile(pr?.displayName ? pr : null);
    } catch {
      /* ignore */
    }
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of exams) {
      m[e.name] = papers.filter((p) => matchExam(p)?.name === e.name).length;
    }
    return m;
  }, [papers]);

  const totalCatalogPapers = papers.length;

  return (
    <Shell profile={profile} active="exams">
      <div className="space-y-8 pb-10">
        {/* Header Section */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <IconSparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Curated Collections</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Target Examination
            </h1>
            <p className="max-w-2xl text-xs font-medium text-slate-500 sm:text-sm">
              Explore specialized mock papers structured around official banking recruitment patterns and syllabus tiers.
            </p>
          </div>

          <Link
            href="/library"
            className="group inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 sm:self-auto"
          >
            <span>All Library Papers ({totalCatalogPapers})</span>
            <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </section>

        {/* Exam Cards Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const count = counts[exam.name] || 0;
            const Icon = exam.icon;
            const isTargetExam =
              profile?.targetExam &&
              exam.terms.some((t) => profile.targetExam.toLowerCase().includes(t));

            return (
              <Link
                key={exam.name}
                href={`/library?exam=${encodeURIComponent(exam.name)}`}
                className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isTargetExam
                    ? "border-indigo-300 ring-2 ring-indigo-500/10 hover:border-indigo-400"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-700 transition duration-200 group-hover:border-indigo-100 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isTargetExam && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                          My Target
                        </span>
                      )}
                      <span className="rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700">
                        {count} {count === 1 ? "paper" : "papers"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                      {exam.name}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {exam.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                  <span>Enter Track</span>
                  <IconArrowRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
                </div>
              </Link>
            );
          })}
        </section>

        {/* Footer Overview Banner */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Cross-Exam Training
            </h3>
            <p className="text-xs text-slate-500">
              Want mixed papers covering Quantitative Aptitude, Reasoning, and English together?
            </p>
          </div>
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <span>Explore Full Catalog</span>
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </Shell>
  );
}