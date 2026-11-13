
"use client";

import Link from "next/link";
import { createElement } from "react";
import type { ComponentType, ReactNode } from "react";

import {
  formatDate,
  getExamForPaper,
  getQuestionCount,
  isFullMock,
  type SavedPaper,
  type AttemptRecord,
} from "@/lib/bankprep-data";

// --- Inline SVGs & Micro-Icons ---

function IconFileText({ className = "w-5 h-5" }: { className?: string }) {
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function IconInbox({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4.586a1 1 0 00-.707.293l-1.414 1.414a2 2 0 01-1.414.586h-3.172a2 2 0 01-1.414-.586l-1.414-1.414A1 1 0 006.586 13H2"
      />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
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

function IconArrowUpRight({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M7 17L17 7m0 0H7m10 0v10"
      />
    </svg>
  );
}

function IconPlay({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function IconClock({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </svg>
  );
}

function IconHelpCircle({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="9" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01"
      />
    </svg>
  );
}

// ─── Component: PageHeading ───────────────────────────────────────────────────

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">
            {eyebrow}
          </p>
        )}

        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>

        <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
          {description}
        </p>
      </div>

      {action && <div className="self-start sm:self-auto">{action}</div>}
    </div>
  );
}

// ─── Component: EmptyState ───────────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  href = "/library",
  action = "Explore mock library",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200/90 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-150 bg-slate-50 text-slate-400">
        <IconInbox className="h-7 w-7 text-slate-400" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-900 sm:text-lg">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>

      {href && action && (
        <Link
          href={href}
          className="group mt-6 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          <span>{action}</span>
          <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Component: PaperCard ────────────────────────────────────────────────────

export function PaperCard({ paper }: { paper: SavedPaper }) {
  const exam = getExamForPaper(paper);

  return (
    <article className="group flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div>
        {/* Card Header & Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-700 transition duration-200 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white">
            <IconFileText className="h-5 w-5" />
          </div>

          {isFullMock(paper) ? (
            <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Full Mock
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Sectional
            </span>
          )}
        </div>

        {/* Title & Category */}
        <h3 className="mt-4 line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-indigo-600 transition">
          {paper.title || "Untitled Assessment"}
        </h3>

        <p className="mt-1 text-xs font-medium text-slate-400">
          {exam?.name || paper.section || "Practice Paper"}
        </p>

        {/* Question & Time Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <IconHelpCircle className="h-3 w-3" />
              <span>Questions</span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-slate-900">
              {getQuestionCount(paper)} Qs
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <IconClock className="h-3 w-3" />
              <span>Duration</span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-slate-900">
              {paper.minutes || 0} mins
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-400">
            {formatDate(paper.savedAt)}
          </span>

          <Link
            href={`/exam/${encodeURIComponent(paper.id)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <IconPlay className="h-2.5 w-2.5 text-indigo-400" />
            <span>Start Test</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Component: AttemptRow ───────────────────────────────────────────────────

export function AttemptRow({
  attempt,
}: {
  attempt: AttemptRecord;
}) {
  const accuracy = attempt.accuracy ?? 0;
  const isHigh = accuracy >= 80;
  const isMid = accuracy >= 60 && accuracy < 80;

  const toneStyle = isHigh
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isMid
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <Link
      href={`/result/${encodeURIComponent(attempt.id)}`}
      className="group flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 transition last:border-0 hover:bg-slate-50/80 sm:px-6"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-xs font-bold text-slate-900 transition group-hover:text-indigo-600 sm:text-sm">
          {attempt.title}
        </p>
        <p className="text-[11px] font-medium text-slate-400">
          {attempt.section} <span className="text-slate-300">·</span>{" "}
          {formatDate(attempt.date)}
        </p>
      </div>

      <div className="flex items-center gap-5 sm:gap-6">
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
            className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-bold ${toneStyle}`}
          >
            {accuracy}%
          </span>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Accuracy
          </p>
        </div>

        <IconArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700" />
      </div>
    </Link>
  );
}

// ─── Component: StatCard ─────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: string | ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-700">
          {typeof icon === "string" ? (
            <span className="font-bold text-xs">{icon}</span>
          ) : (
            createElement(icon, { className: "h-4 w-4" })
          )}
        </div>
      </div>

      <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-400">{note}</p>
    </div>
  );
}
