"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatInlineMath } from "@/lib/format-inline-math";

type ParsedQuestion = {
  questionNumber: number;
  question: string;
  options: Partial<Record<"A" | "B" | "C" | "D" | "E", string>>;
  correctAnswer?: string | null;
  answer?: string | null;
};

type PaperRow = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  is_published: boolean;
  created_at: string;
  questions: ParsedQuestion[] | null;
  paper_text?: string;
  answer_key_text?: string;
};

type FilterType = "all" | "published" | "draft";

const LEGACY_PAPERS_KEY = "ibps-mock-saved-papers-v1";
const LEGACY_MIGRATION_MARKER = "ibps-local-papers-migration-v1";
const LEGACY_PAPER_LIMIT = 4;

type LegacyPaper = {
  id?: string;
  title?: string;
  name?: string;
  section?: string;
  minutes?: number;
  duration?: number;
  questions?: ParsedQuestion[];
  paper_text?: string;
  paperText?: string;
  rawText?: string;
  answer_key_text?: string;
  answerKeyText?: string;
  answerKey?: string;
  is_published?: boolean;
  isPublished?: boolean;
  created_at?: string;
  createdAt?: string;
};

function readLegacyPapers(): LegacyPaper[] {
  try {
    const raw = localStorage.getItem(LEGACY_PAPERS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    const records = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { papers?: unknown }).papers)
        ? (parsed as { papers: unknown[] }).papers
        : [];

    return records
      .filter(
        (item): item is LegacyPaper =>
          Boolean(item) && typeof item === "object"
      )
      .slice(0, LEGACY_PAPER_LIMIT);
  } catch {
    return [];
  }
}

function normalizeLegacyPaper(
  paper: LegacyPaper,
  index: number,
  userId: string
) {
  const title = String(
    paper.title ?? paper.name ?? `Imported legacy paper ${index + 1}`
  ).trim();

  const section = String(paper.section ?? "Full Mock Test").trim();

  const rawMinutes = Number(paper.minutes ?? paper.duration ?? 60);

  const minutes =
    Number.isFinite(rawMinutes) && rawMinutes > 0
      ? Math.round(rawMinutes)
      : 60;

  const questions = Array.isArray(paper.questions)
    ? paper.questions
    : [];

  return {
    title: title || `Imported legacy paper ${index + 1}`,
    section: section || "Full Mock Test",
    minutes,
    questions,
    paper_text: String(
      paper.paper_text ?? paper.paperText ?? paper.rawText ?? ""
    ),
    answer_key_text: String(
      paper.answer_key_text ??
        paper.answerKeyText ??
        paper.answerKey ??
        ""
    ),

    // Old papers are imported as drafts.
    // They are never published automatically.
    is_published: false,
    created_by: userId,
  };
}

// --- Inline SVGs & Micro-Icons ---

function IconLayers({ className = "w-5 h-5" }: { className?: string }) {
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

function IconCheckCircle({
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4"
      />
    </svg>
  );
}

function IconEdit({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function IconHelpCircle({
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01"
      />
    </svg>
  );
}

function IconSearch({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35"
      />
    </svg>
  );
}

function IconRefresh({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
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

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function IconEye({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function IconEyeOff({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
      />
    </svg>
  );
}

function IconLogOut({ className = "w-4 h-4" }: { className?: string }) {
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7v5l3 2"
      />
    </svg>
  );
}

function IconAlertCircle({
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4m0 4h.01"
      />
    </svg>
  );
}

function IconSpinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function IconClose({ className = "w-4 h-4" }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export default function AdminPapersPage() {
  const router = useRouter();

  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [inspectPaper, setInspectPaper] = useState<PaperRow | null>(null);

  const [legacyPaperCount, setLegacyPaperCount] = useState(0);
  const [legacyMigrationDone, setLegacyMigrationDone] = useState(false);
  const [migratingLegacy, setMigratingLegacy] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadPapers = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setMessage("");

      try {
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/admin/login");
          return;
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/admin/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || profile?.role !== "admin") {
          await supabase.auth.signOut();
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("papers")
          .select("id, title, section, minutes, is_published, created_at, questions")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPapers((data as PaperRow[] | null) ?? []);
      } catch (error) {
        notify(getErrorMessage(error), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadPapers();

    try {
      setLegacyMigrationDone(
        localStorage.getItem(LEGACY_MIGRATION_MARKER) === "done"
      );
      setLegacyPaperCount(readLegacyPapers().length);
    } catch {
      setLegacyMigrationDone(false);
      setLegacyPaperCount(0);
    }
  }, [loadPapers]);

  async function migrateLegacyPapers() {
    if (migratingLegacy) return;

    try {
      if (localStorage.getItem(LEGACY_MIGRATION_MARKER) === "done") {
        setLegacyMigrationDone(true);
        notify("Legacy paper migration has already completed on this browser.");
        return;
      }
    } catch {
      notify("Your browser does not allow localStorage access.", "error");
      return;
    }

    const legacyPapers = readLegacyPapers();

    if (legacyPapers.length === 0) {
      notify(
        `No papers found under localStorage key "${LEGACY_PAPERS_KEY}". Make sure you are using the same browser that contains the four old papers.`,
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      `Migrate up to ${legacyPapers.length} legacy paper(s) from this browser to Supabase as drafts? Existing Supabase papers will not be published or overwritten.`
    );

    if (!confirmed) return;

    setMigratingLegacy(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        throw new Error(
          "Your admin session is missing or expired. Please sign in again before migrating."
        );
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          authError?.message ||
            "Could not verify your administrator session. Please sign in again."
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        throw new Error("Only an administrator can migrate legacy papers.");
      }

      const { data: existingRows, error: existingError } = await supabase
        .from("papers")
        .select("id, title, section, questions");

      if (existingError) throw existingError;

      const existingSignatures = new Set(
        (existingRows ?? []).map(
          (row: {
            title?: string;
            section?: string;
            questions?: unknown;
          }) => {
            const count = Array.isArray(row.questions)
              ? row.questions.length
              : 0;

            return `${String(row.title ?? "").trim().toLowerCase()}|${String(
              row.section ?? ""
            )
              .trim()
              .toLowerCase()}|${count}`;
          }
        )
      );

      let inserted = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let index = 0; index < legacyPapers.length; index += 1) {
        const payload = normalizeLegacyPaper(
          legacyPapers[index],
          index,
          user.id
        );

        const questionCount = payload.questions.length;
        const signature = `${payload.title
          .trim()
          .toLowerCase()}|${payload.section
          .trim()
          .toLowerCase()}|${questionCount}`;

        if (existingSignatures.has(signature)) {
          skipped += 1;
          continue;
        }

        const { error: insertError } = await supabase
          .from("papers")
          .insert(payload);

        if (insertError) {
          errors.push(`${payload.title}: ${insertError.message}`);
          continue;
        }

        existingSignatures.add(signature);
        inserted += 1;
      }

      if (errors.length > 0) {
        notify(
          `Migration partially completed: ${inserted} imported, ${skipped} matching paper(s) skipped. Fix these errors and retry: ${errors.join(" | ")}`,
          "error"
        );
      } else {
        localStorage.setItem(LEGACY_MIGRATION_MARKER, "done");
        setLegacyMigrationDone(true);

        notify(
          `Migration complete: ${inserted} paper(s) imported as drafts; ${skipped} matching paper(s) skipped. Your localStorage backup has been kept.`
        );
      }

      setLegacyPaperCount(readLegacyPapers().length);
      await loadPapers(true);
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setMigratingLegacy(false);
    }
  }

  async function togglePublish(paper: PaperRow) {
    if (busyId) return;

    setBusyId(paper.id);
    setMessage("");

    try {
      const supabase = createClient();
      const nextPublishedState = !paper.is_published;

      const { error } = await supabase
        .from("papers")
        .update({
          is_published: nextPublishedState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paper.id);

      if (error) throw error;

      setPapers((previous) =>
        previous.map((item) =>
          item.id === paper.id
            ? { ...item, is_published: nextPublishedState }
            : item
        )
      );

      if (inspectPaper?.id === paper.id) {
        setInspectPaper((previous) =>
          previous
            ? { ...previous, is_published: nextPublishedState }
            : null
        );
      }

      notify(
        nextPublishedState
          ? `"${paper.title}" is now published and live.`
          : `"${paper.title}" was moved back to drafts.`
      );
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function removePaper(paper: PaperRow) {
    if (busyId) return;

    const confirmed = window.confirm(
      `Delete "${paper.title}" permanently?\n\nThis will remove the paper from the repository.`
    );

    if (!confirmed) return;

    setBusyId(paper.id);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("papers")
        .delete()
        .eq("id", paper.id);

      if (error) throw error;

      setPapers((previous) =>
        previous.filter((item) => item.id !== paper.id)
      );

      if (inspectPaper?.id === paper.id) {
        setInspectPaper(null);
      }

      notify("Mock test deleted successfully.");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    const confirmed = window.confirm(
      "Sign out of the administrator workspace?"
    );

    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      notify(error.message, "error");
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPapers = papers.filter((paper) => {
    const matchesSearch =
      paper.title.toLowerCase().includes(normalizedSearch) ||
      (paper.section ?? "").toLowerCase().includes(normalizedSearch);

    const matchesFilter =
      filter === "all" ||
      (filter === "published" && paper.is_published) ||
      (filter === "draft" && !paper.is_published);

    return matchesSearch && matchesFilter;
  });

  const publishedCount = papers.filter(
    (paper) => paper.is_published
  ).length;

  const draftCount = papers.length - publishedCount;

  const totalQuestions = papers.reduce(
    (total, paper) =>
      total +
      (Array.isArray(paper.questions) ? paper.questions.length : 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50/60 pb-16 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <IconLayers className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight text-slate-950">
                  BankPrep Console
                </span>

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Admin
                </span>
              </div>

              <p className="text-[11px] font-medium text-slate-400">
                Assessment Repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              Public App →
            </Link>

            <button
              type="button"
              onClick={() => void loadPapers(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <IconRefresh
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin text-indigo-600" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100/70"
            >
              <IconLogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Heading */}
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600" />
              Curriculum Control
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Mock Examination Directory
            </h1>

            <p className="max-w-2xl text-xs font-medium text-slate-500 sm:text-sm">
              Author, calibrate timing, manage question keys, and review
              questions before publishing to candidates.
            </p>
          </div>

          <Link
            href="/admin/papers/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition hover:bg-slate-800"
          >
            <IconPlus className="h-4 w-4" />
            Create &amp; Import Paper
          </Link>
        </section>

        {/* Alerts */}
        {message && (
          <div
            role={messageType === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-xs transition-all ${
              messageType === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {messageType === "error" ? (
                <IconAlertCircle className="h-4 w-4 text-rose-600" />
              ) : (
                <IconCheckCircle className="h-4 w-4 text-emerald-600" />
              )}
            </div>

            <p className="flex-1 font-medium leading-relaxed">{message}</p>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss alert"
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* One-time legacy migration */}
        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <IconRefresh className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Legacy paper migration
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                  Move your old localStorage papers into Supabase once.
                  Imported papers remain drafts until you review and publish
                  them. Your localStorage backup will not be deleted.
                </p>

                <p className="mt-2 text-xs font-semibold text-slate-600">
                  {legacyMigrationDone
                    ? "Migration marked complete on this browser."
                    : `${legacyPaperCount} legacy paper(s) detected · one-time migration`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void migrateLegacyPapers()}
              disabled={
                migratingLegacy ||
                legacyMigrationDone ||
                legacyPaperCount === 0
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {migratingLegacy ? (
                <IconSpinner className="h-4 w-4" />
              ) : (
                <IconRefresh className="h-4 w-4" />
              )}

              {migratingLegacy
                ? "Migrating..."
                : legacyMigrationDone
                  ? "Already Migrated"
                  : "Migrate Legacy Papers"}
            </button>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Mock Tests"
            value={papers.length}
            note="Saved to repository"
            icon={IconLayers}
            variant="indigo"
          />

          <StatCard
            label="Published"
            value={publishedCount}
            note="Live in student catalog"
            icon={IconCheckCircle}
            variant="emerald"
          />

          <StatCard
            label="Drafts"
            value={draftCount}
            note="Unpublished / Under review"
            icon={IconEdit}
            variant="amber"
          />

          <StatCard
            label="Total Questions"
            value={totalQuestions}
            note="In current paper pool"
            icon={IconHelpCircle}
            variant="slate"
          />
        </section>

        {/* Papers Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-1">
                {(
                  [
                    { id: "all", label: "All Papers", count: papers.length },
                    {
                      id: "published",
                      label: "Published",
                      count: publishedCount,
                    },
                    { id: "draft", label: "Drafts", count: draftCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      filter === tab.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>

                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        filter === tab.id
                          ? "bg-slate-100 text-slate-800"
                          : "bg-slate-200/60 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-0 sm:min-w-72">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <IconSearch className="h-4 w-4" />
                </div>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by title or section..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-100 p-4"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/4 rounded bg-slate-100" />
                    <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                  </div>
                  <div className="h-8 w-20 rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <IconLayers className="h-6 w-6" />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-900">
                {papers.length === 0
                  ? "No mock tests configured"
                  : "No matching mock tests"}
              </h3>

              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                {papers.length === 0
                  ? "Begin building your test catalogue by importing your first practice test."
                  : "Try clearing your search query or altering publication filters."}
              </p>

              {papers.length === 0 && (
                <Link
                  href="/admin/papers/new"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <IconPlus className="h-4 w-4" />
                  Create First Mock
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">Mock Paper Title</th>
                    <th className="px-4 py-3.5">Questions</th>
                    <th className="px-4 py-3.5">Duration</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPapers.map((paper) => {
                    const questionCount = Array.isArray(paper.questions)
                      ? paper.questions.length
                      : 0;

                    const isBusy = busyId === paper.id;

                    return (
                      <tr
                        key={paper.id}
                        className="group transition hover:bg-slate-50/80"
                      >
                        <td className="max-w-md px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 font-bold text-indigo-700">
                              <IconLayers className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900 transition group-hover:text-indigo-600">
                                {paper.title}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {paper.section}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-700">
                          {questionCount} Qs
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <IconClock className="text-slate-400" />
                            {paper.minutes}m
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge published={paper.is_published} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-400">
                          {formatDate(paper.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectPaper(paper)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                              title="Inspect & Review Questions"
                            >
                              <IconEye className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Review</span>
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(busyId)}
                              onClick={() => void togglePublish(paper)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
                                paper.is_published
                                  ? "border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-100/70"
                                  : "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100/70"
                              }`}
                            >
                              {isBusy ? (
                                <IconSpinner className="h-3 w-3" />
                              ) : paper.is_published ? (
                                <IconEyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <IconCheckCircle className="h-3.5 w-3.5" />
                              )}

                              <span>
                                {paper.is_published ? "Unpublish" : "Publish"}
                              </span>
                            </button>

                            <Link
                              href={`/admin/papers/${paper.id}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            >
                              <IconEdit className="h-3.5 w-3.5 text-slate-500" />
                              <span>Edit</span>
                            </Link>

                            <button
                              type="button"
                              disabled={Boolean(busyId)}
                              onClick={() => void removePaper(paper)}
                              className="inline-flex items-center rounded-lg border border-rose-200/80 bg-white px-2 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                              title="Delete Paper"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-medium text-slate-500">
            <span>BankPrep Assessment Management</span>
            <span>
              {publishedCount} Published · {draftCount} Drafts
            </span>
          </footer>
        </section>
      </div>

      {/* Question Inspection Modal */}
      {inspectPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {inspectPaper.title}
                  </h3>
                  <StatusBadge published={inspectPaper.is_published} />
                </div>

                <p className="text-xs text-slate-500">
                  {inspectPaper.section} · {inspectPaper.minutes} mins ·{" "}
                  {inspectPaper.questions?.length || 0} questions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/papers/${inspectPaper.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  <IconEdit className="h-3.5 w-3.5" />
                  Full Editor &amp; Re-parse
                </Link>

                <button
                  type="button"
                  onClick={() => setInspectPaper(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {inspectPaper.questions &&
              inspectPaper.questions.length > 0 ? (
                inspectPaper.questions.map((question, index) => (
                  <div
                    key={`${question.questionNumber ?? index}-${index}`}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-slate-900">
                        <span className="mr-1.5 font-bold text-indigo-600">
                          Q{question.questionNumber || index + 1}.
                        </span>
                        {formatInlineMath(question.question)}
                      </p>

                      <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                        Key:{" "}
                        {question.correctAnswer ||
                          question.answer ||
                          "Unassigned"}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {(["A", "B", "C", "D", "E"] as const).map(
                        (letter) => {
                          const option = question.options?.[letter];

                          if (!option) {
                            return null;
                          }

                          const isCorrect =
                            (question.correctAnswer || question.answer) ===
                            letter;

                          return (
                            <div
                              key={letter}
                              className={`rounded-lg border px-3 py-1.5 text-xs ${
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-900"
                                  : "border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              <span className="mr-1.5 font-bold">
                                {letter}.
                              </span>
                              {formatInlineMath(option)}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No parsed questions found on this record. Click Full Editor
                  &amp; Re-parse to inspect the raw input text.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
              <span className="text-xs text-slate-500">
                Created on {formatDate(inspectPaper.created_at)}
              </span>

              <button
                type="button"
                onClick={() => setInspectPaper(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "indigo" | "emerald" | "amber" | "slate";
}) {
  const styles = {
    indigo: "border-indigo-100 bg-indigo-50/70 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    slate: "border-slate-200 bg-slate-100/70 text-slate-700",
  }[variant];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-400">{note}</p>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
        published
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          published ? "animate-pulse bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}
