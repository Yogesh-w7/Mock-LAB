"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parsePaper } from "@/lib/question-importer";

// --- Clean SVG Icons ---
function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconDocumentText({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

function IconKey({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

function IconCheckCircle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function IconClose({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

// --- Types ---
type NoticeState = {
  type: "error" | "success" | "info";
  message: string;
} | null;

type SectionBlock = {
  id: string;
  name: string;
  minutes: number;
  paperText: string;
  keyText: string;
};

const SECTION_PRESETS = [
  "Quantitative Aptitude",
  "Reasoning Ability",
  "English Language",
  "General Awareness",
  "Computer Knowledge",
  "Data Analysis & Interpretation",
  "Financial Awareness",
  "Banking Awareness",
] as const;

const EXAM_TEMPLATES: {
  id: string;
  label: string;
  sections: { name: string; minutes: number }[];
}[] = [
  {
    id: "ibps-po-prelims",
    label: "IBPS PO Prelims",
    sections: [
      { name: "English Language", minutes: 20 },
      { name: "Quantitative Aptitude", minutes: 20 },
      { name: "Reasoning Ability", minutes: 20 },
    ],
  },
  {
    id: "ibps-clerk-prelims",
    label: "IBPS Clerk Prelims",
    sections: [
      { name: "English Language", minutes: 20 },
      { name: "Numerical Ability", minutes: 20 },
      { name: "Reasoning Ability", minutes: 20 },
    ],
  },
  {
    id: "sbi-po-prelims",
    label: "SBI PO Prelims",
    sections: [
      { name: "English Language", minutes: 20 },
      { name: "Quantitative Aptitude", minutes: 20 },
      { name: "Reasoning Ability", minutes: 20 },
    ],
  },
  {
    id: "rrb-officer-prelims",
    label: "IBPS RRB Officer (2 Sections)",
    sections: [
      { name: "Reasoning Ability", minutes: 22 },
      { name: "Quantitative Aptitude", minutes: 23 },
    ],
  },
  {
    id: "ibps-po-mains",
    label: "IBPS PO Mains (4 Sections)",
    sections: [
      { name: "Reasoning & Computer Aptitude", minutes: 45 },
      { name: "Data Analysis & Interpretation", minutes: 45 },
      { name: "English Language", minutes: 40 },
      { name: "General / Economy / Banking Awareness", minutes: 35 },
    ],
  },
];

function newSection(partial?: Partial<SectionBlock>): SectionBlock {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: partial?.name ?? "Quantitative Aptitude",
    minutes: partial?.minutes ?? 20,
    paperText: partial?.paperText ?? "",
    keyText: partial?.keyText ?? "",
  };
}

const MAX_SECTIONS = 8;

export default function AdminNewPaperPage() {
  const router = useRouter();
  const [title, setTitle] = useState("IBPS Practice Mock");
  const [paperMode, setPaperMode] = useState<"single" | "full">("full");
  const [section, setSection] = useState("Quantitative Aptitude");
  const [minutes, setMinutes] = useState(20);
  const [paper, setPaper] = useState("");
  const [keyText, setKeyText] = useState("");

  const [sections, setSections] = useState<SectionBlock[]>([
    newSection({ name: "English Language", minutes: 20 }),
    newSection({ name: "Quantitative Aptitude", minutes: 20 }),
    newSection({ name: "Reasoning Ability", minutes: 20 }),
  ]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [savingMode, setSavingMode] = useState<"draft" | "publish" | null>(null);

  const activeSection =
    sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? null;

  // Single-mode preview diagnostics
  const singlePreview = useMemo(() => {
    if (paperMode !== "single" || !paper.trim()) return null;
    try {
      const parsed = parsePaper(paper, keyText, section);
      return {
        count: parsed.questions.length,
        hasAnswers: parsed.questions.filter((q) => q.correctAnswer).length,
      };
    } catch {
      return null;
    }
  }, [paperMode, paper, keyText, section]);

  // Full-mock preview diagnostics
  const fullPreview = useMemo(() => {
    if (paperMode !== "full") return null;
    let totalQ = 0;
    let totalAns = 0;
    const perSection: { name: string; count: number; answers: number; minutes: number }[] = [];

    for (const s of sections) {
      if (!s.paperText.trim()) {
        perSection.push({ name: s.name, count: 0, answers: 0, minutes: s.minutes });
        continue;
      }
      try {
        const parsed = parsePaper(s.paperText, s.keyText, s.name);
        const count = parsed.questions.length;
        const answers = parsed.questions.filter((q) => q.correctAnswer).length;
        totalQ += count;
        totalAns += answers;
        perSection.push({
          name: s.name,
          count,
          answers,
          minutes: s.minutes,
        });
      } catch {
        perSection.push({ name: s.name, count: 0, answers: 0, minutes: s.minutes });
      }
    }

    return {
      totalQ,
      totalAns,
      totalMinutes: sections.reduce((sum, s) => sum + (s.minutes || 0), 0),
      perSection,
    };
  }, [paperMode, sections]);

  function applyTemplate(templateId: string) {
    const t = EXAM_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    const next = t.sections.map((s) =>
      newSection({ name: s.name, minutes: s.minutes })
    );
    setSections(next);
    setActiveSectionId(next[0]?.id ?? null);
  }

  function addSection() {
    if (sections.length >= MAX_SECTIONS) {
      setNotice({
        type: "error",
        message: `Maximum of ${MAX_SECTIONS} sections allowed per examination paper.`,
      });
      return;
    }
    const used = new Set(sections.map((s) => s.name));
    const nextName =
      SECTION_PRESETS.find((p) => !used.has(p)) ?? `Section ${sections.length + 1}`;
    const s = newSection({ name: nextName, minutes: 20 });
    setSections((prev) => [...prev, s]);
    setActiveSectionId(s.id);
  }

  function removeSection(idToRemove: string) {
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== idToRemove);
      if (activeSectionId === idToRemove) {
        setActiveSectionId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function updateSection(idToUpdate: string, patch: Partial<SectionBlock>) {
    setSections((prev) =>
      prev.map((s) => (s.id === idToUpdate ? { ...s, ...patch } : s))
    );
  }

  async function handleSave(publish: boolean) {
    setNotice(null);

    try {
      let questions: unknown[] = [];
      let paper_text = "";
      let answer_key_text = "";
      let finalSection = section;
      let finalMinutes = Math.max(1, minutes);
      const sectionsPayload: {
        name: string;
        minutes: number;
        questions: unknown[];
        paper_text: string;
        answer_key_text: string;
      }[] = [];

      if (paperMode === "single") {
        const parsed = parsePaper(paper, keyText, section);
        if (!parsed.questions.length) {
          setNotice({
            type: "error",
            message: "No valid questions detected. Verify that items start with Q1., 1. and have option choices.",
          });
          return;
        }
        questions = parsed.questions;
        paper_text = paper;
        answer_key_text = keyText;
        finalSection = section;
        finalMinutes = Math.max(1, minutes);
      } else {
        if (!sections.length) {
          setNotice({
            type: "error",
            message: "Add at least one section before saving this full mock.",
          });
          return;
        }

        let globalOffset = 0;
        for (const s of sections) {
          if (!s.paperText.trim()) {
            setNotice({
              type: "error",
              message: `Section "${s.name}" is missing question text. Provide content or remove this section.`,
            });
            return;
          }
          const parsed = parsePaper(s.paperText, s.keyText, s.name);
          if (!parsed.questions.length) {
            setNotice({
              type: "error",
              message: `Could not parse questions in section "${s.name}". Check question prefixes and option markers.`,
            });
            return;
          }

          const renumbered = parsed.questions.map((q, i) => ({
            ...q,
            questionNumber: globalOffset + i + 1,
            sectionName: s.name,
            section: s.name,
          }));
          globalOffset += renumbered.length;

          sectionsPayload.push({
            name: s.name,
            minutes: Math.max(1, s.minutes || 1),
            questions: renumbered,
            paper_text: s.paperText,
            answer_key_text: s.keyText,
          });
          questions = [...questions, ...renumbered];
        }

        paper_text = sections
          .map((s) => `=== ${s.name} (${s.minutes} min) ===\n${s.paperText}`)
          .join("\n\n");
        answer_key_text = sections
          .map((s) => `=== ${s.name} ===\n${s.keyText}`)
          .join("\n\n");
        finalSection = "Full Mock Test";
        finalMinutes = sections.reduce(
          (sum, s) => sum + Math.max(1, s.minutes || 1),
          0
        );
      }

      setSavingMode(publish ? "publish" : "draft");

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: Record<string, unknown> = {
        title: title.trim() || "Untitled Mock",
        section: finalSection,
        minutes: finalMinutes,
        questions,
        paper_text,
        answer_key_text,
        is_published: publish,
        created_by: user?.id ?? null,
        exam_config: {
          marksPerQuestion: 1,
          negativeMarks: 0.25,
          sections:
            paperMode === "full"
              ? sectionsPayload.map((s) => ({
                  key: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                  title: s.name,
                  minutes: s.minutes,
                  questionNumbers: (s.questions as { questionNumber: number }[]).map(
                    (q) => q.questionNumber
                  ),
                }))
              : undefined,
        },
      };

      if (paperMode === "full") {
        payload.sections = sectionsPayload;
        payload.is_sectional = true;
      }

      const { error } = await supabase
        .from("papers")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        // Safe fallback if relational json columns are not present
        if (
          error.message?.includes("sections") ||
          error.message?.includes("is_sectional")
        ) {
          delete payload.sections;
          delete payload.is_sectional;
          const retry = await supabase
            .from("papers")
            .insert(payload)
            .select("id")
            .single();

          if (retry.error) {
            setNotice({
              type: "error",
              message: retry.error.message || "Failed to save paper.",
            });
            setSavingMode(null);
            return;
          }
        } else {
          setNotice({
            type: "error",
            message: error.message || "Failed to save mock examination paper.",
          });
          setSavingMode(null);
          return;
        }
      }

      setNotice({
        type: "success",
        message: publish
          ? "Paper successfully published to the candidate portal."
          : "Draft saved to administrator database.",
      });

      setTimeout(() => {
        router.push("/admin/papers");
        router.refresh();
      }, 700);
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred while saving.",
      });
      setSavingMode(null);
    }
  }

  const isSaving = savingMode !== null;

  return (
    <main className="min-h-screen bg-slate-50/70 pb-20 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Navigation Bar */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <Link
            href="/admin/papers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Back to Directory
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900 animate-pulse" />
            Console Authoring
          </span>
        </header>

        {/* Page Title */}
        <div className="mb-8 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <IconLayers className="h-4 w-4 text-slate-900" />
            Assessment Builder
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Create Examination Paper
          </h1>
          <p className="text-xs text-slate-500">
            Build single-topic practice drills or multi-sectional full mocks with strict sectional timing limits.
          </p>
        </div>

        {/* Global Alert Notification */}
        {notice && (
          <div
            role="alert"
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-xs font-medium transition-all ${
              notice.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {notice.type === "error" ? (
                <IconAlertCircle className="h-4 w-4 text-rose-600" />
              ) : (
                <IconCheckCircle className="h-4 w-4 text-emerald-600" />
              )}
            </div>
            <p className="flex-1 leading-relaxed">{notice.message}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Card 1: Parameters & Modality */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <IconDocumentText className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">1. Exam Configuration</h2>
              </div>

              {/* Format Toggle Pill */}
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setPaperMode("single")}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                    paperMode === "single"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Single Section
                </button>
                <button
                  type="button"
                  onClick={() => setPaperMode("full")}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                    paperMode === "full"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Full Mock (Multi-Section)
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Paper Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. SBI PO Prelims 2026 - Speed Mock 01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none sm:text-sm"
                />
              </div>

              {paperMode === "single" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Subject Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none sm:text-sm"
                  >
                    {SECTION_PRESETS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="Mixed Mock Test">Mixed Mock Test</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Total Duration (Auto-summed)
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 sm:text-sm">
                    <IconClock className="h-4 w-4 text-slate-400" />
                    <span>{fullPreview?.totalMinutes || 0} Minutes</span>
                  </div>
                </div>
              )}
            </div>

            {paperMode === "single" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Duration (Minutes)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <IconClock className="h-4 w-4" />
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Marking Scheme
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700">
                    +1.00 Correct / −0.25 Penalty
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ==================== FULL MOCK WORKSPACE ==================== */}
          {paperMode === "full" && (
            <div className="space-y-6">
              {/* Structure Card */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      2. Sectional Allocation &amp; Pattern Presets
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Apply an official examination blueprint or build your own custom multi-section layout (up to {MAX_SECTIONS}).
                    </p>
                  </div>

                  {/* Summary Metric Pills */}
                  {fullPreview && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {fullPreview.totalQ} Questions
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                        {fullPreview.totalAns} Keys Paired
                      </span>
                    </div>
                  )}
                </div>

                {/* Template Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Apply Blueprint:</span>
                  {EXAM_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Section Navigation Tabs & Add Button */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {sections.map((s, idx) => {
                    const isActive = (activeSection?.id ?? "") === s.id;
                    const prev = fullPreview?.perSection[idx];

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSectionId(s.id)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <span className="font-mono text-[10px] opacity-70">{idx + 1}.</span>
                        <span>{s.name}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                            isActive ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"
                          }`}
                        >
                          {s.minutes}m {prev && prev.count > 0 ? `· ${prev.count}Q` : ""}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addSection}
                    disabled={sections.length >= MAX_SECTIONS}
                    className="inline-flex items-center gap-1 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Add Section
                  </button>
                </div>
              </section>

              {/* Active Section Workbench */}
              {activeSection && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Section Subject Label
                        </label>
                        <select
                          value={
                            SECTION_PRESETS.includes(
                              activeSection.name as (typeof SECTION_PRESETS)[number]
                            )
                              ? activeSection.name
                              : "__custom__"
                          }
                          onChange={(e) => {
                            if (e.target.value === "__custom__") return;
                            updateSection(activeSection.id, { name: e.target.value });
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                        >
                          {SECTION_PRESETS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          <option value="__custom__">Custom…</option>
                        </select>
                      </div>

                      {!SECTION_PRESETS.includes(
                        activeSection.name as (typeof SECTION_PRESETS)[number]
                      ) && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Custom Name
                          </label>
                          <input
                            type="text"
                            value={activeSection.name}
                            onChange={(e) =>
                              updateSection(activeSection.id, { name: e.target.value })
                            }
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold focus:border-slate-900 focus:outline-none"
                            placeholder="Type title..."
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Timer Limit
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={activeSection.minutes}
                            onChange={(e) =>
                              updateSection(activeSection.id, {
                                minutes: Number(e.target.value) || 1,
                              })
                            }
                            className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-center font-bold text-slate-900 font-mono focus:border-slate-900 focus:bg-white focus:outline-none"
                          />
                          <span className="text-xs font-bold text-slate-500">mins</span>
                        </div>
                      </div>
                    </div>

                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(activeSection.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        Remove Section
                      </button>
                    )}
                  </div>

                  {/* Section Content Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Question Paper Text — {activeSection.name}
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          {activeSection.paperText.length.toLocaleString()} characters
                        </span>
                      </div>
                      <textarea
                        value={activeSection.paperText}
                        onChange={(e) =>
                          updateSection(activeSection.id, { paperText: e.target.value })
                        }
                        rows={10}
                        placeholder={`Paste questions for ${activeSection.name}...\n\nQ1. What is the value of...\nA) 10\nB) 20\nC) 30\nD) 40\nE) 50`}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <IconKey className="h-3.5 w-3.5 text-slate-700" />
                        <span>Answer Key — {activeSection.name}</span>
                      </label>
                      <textarea
                        value={activeSection.keyText}
                        onChange={(e) =>
                          updateSection(activeSection.id, { keyText: e.target.value })
                        }
                        rows={3}
                        placeholder={`1-C\n2-A\n3-E`}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                      />
                      <p className="text-[11px] text-slate-400">
                        Format: &quot;1-C&quot; or &quot;Q1. C&quot; on separate lines. Keys pair automatically with items in this section.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ==================== SINGLE SECTION WORKSPACE ==================== */}
          {paperMode === "single" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <IconDocumentText className="h-4 w-4 text-slate-700" />
                    <h2 className="text-sm font-bold text-slate-900">2. Question Paper Text</h2>
                  </div>
                  {singlePreview && (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {singlePreview.count} Questions recognized
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <textarea
                    value={paper}
                    onChange={(e) => setPaper(e.target.value)}
                    rows={12}
                    placeholder={`Paste questions here...\n\nQ1. Question text...\nA) Option A\nB) Option B\nC) Option C\nD) Option D\nE) Option E`}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Questions should begin with Q1., 1. followed by option markers A), B), C), D), E).
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <IconKey className="h-3.5 w-3.5 text-slate-700" />
                    <span>Answer Key Mapping</span>
                  </label>
                  <textarea
                    value={keyText}
                    onChange={(e) => setKeyText(e.target.value)}
                    rows={4}
                    placeholder={`1-C\n2-A\n3-B`}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </section>
            </div>
          )}

          {/* Action Execution Bar */}
          <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 pt-5 sm:flex-row">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingMode === "draft" ? (
                <>
                  <IconSpinner className="h-3.5 w-3.5 text-slate-600" />
                  Saving Draft…
                </>
              ) : (
                "Save as Draft"
              )}
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingMode === "publish" ? (
                <>
                  <IconSpinner className="h-3.5 w-3.5 text-white" />
                  Publishing Exam…
                </>
              ) : (
                "Publish Mock Paper"
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}