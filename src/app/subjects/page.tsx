"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AppShell from "@/components/app-shell";
import { EmptyState, PageHeading } from "@/components/page-ui";

import {
  PAPERS_KEY,
  readStorage,
  subjects,
  type SavedPaper,
} from "@/lib/bankprep-data";

// --- Inline Interactive SVGs & Subject Icons ---
function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
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

function IconCalculator({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" strokeLinecap="round" strokeWidth={3} />
    </svg>
  );
}

function IconBrain({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  );
}

function IconBookOpen({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function IconGlobe({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <line x1="3.6" y1="9" x2="20.4" y2="9" />
      <line x1="3.6" y1="15" x2="20.4" y2="15" />
      <path strokeLinecap="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
    </svg>
  );
}

function IconCpu({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path strokeLinecap="round" d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
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

function resolveSubjectIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("quant") || normalized.includes("math")) return IconCalculator;
  if (normalized.includes("reason") || normalized.includes("logic")) return IconBrain;
  if (normalized.includes("english") || normalized.includes("language")) return IconBookOpen;
  if (normalized.includes("general") || normalized.includes("awareness")) return IconGlobe;
  if (normalized.includes("computer")) return IconCpu;
  return IconLayers;
}

export default function SubjectsPage() {
  const [papers, setPapers] = useState<SavedPaper[]>([]);

  useEffect(() => {
    function load() {
      setPapers(readStorage<SavedPaper>(PAPERS_KEY));
    }

    load();
    window.addEventListener("focus", load);
    window.addEventListener("storage", load);

    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  return (
    <AppShell active="/subjects">
      <div className="space-y-8 pb-12 antialiased">
        {/* Header Section */}
        <div className="space-y-1 border-b border-slate-200/80 pb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <IconSparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Targeted Practice</span>
          </div>

          <PageHeading
            eyebrow=""
            title="Practice by Subject"
            description="Isolate topics, identify sectional vulnerabilities, and focus your drills on specific syllabus modules."
          />
        </div>

        {/* Subjects Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => {
            const count = papers.filter(
              (paper) => paper.section === subject.name
            ).length;

            const SubjectIcon = resolveSubjectIcon(subject.name);

            return (
              <article
                key={subject.name}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-600 transition-colors duration-200 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white">
                      <SubjectIcon className="h-5 w-5" />
                    </div>

                    <span className="inline-flex items-center rounded-lg border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700">
                      {count} {count === 1 ? "paper" : "papers"}
                    </span>
                  </div>

                  {/* Subtitle & Title */}
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                      {subject.short}
                    </p>
                    <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                      {subject.name}
                    </h2>
                    <p className="mt-2 min-h-[48px] text-xs leading-relaxed text-slate-500">
                      {subject.description}
                    </p>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <Link
                    href={`/library?subject=${encodeURIComponent(subject.name)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 transition group-hover:text-indigo-600"
                  >
                    <span>Explore practice papers</span>
                    <IconArrowRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Empty State Fallback */}
        {papers.length === 0 && (
          <EmptyState
            title="Your subject library is empty"
            description="Complete or import question papers to populate your sectional practice repository."
            href="/library"
            action="Browse all mocks"
          />
        )}
      </div>
    </AppShell>
  );
}