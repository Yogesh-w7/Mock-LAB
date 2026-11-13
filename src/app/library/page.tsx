"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shell } from "../page";

type QuestionSummary = {
  questionNumber: number;
};

type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: QuestionSummary[];
  savedAt: number;
  is_published: boolean;
};

type UserProfile = {
  displayName: string;
  targetExam: string;
  avatarHue?: number;
};

type Tab = "all" | "full" | "section";
type SortBy = "newest" | "oldest" | "title" | "questions";

const PROFILE_KEY = "ibps-mock-user-profile-v1";
const PAGE_SIZE = 12;

const SECTIONS = [
  "All",
  "Quantitative Aptitude",
  "Reasoning Ability",
  "English Language",
  "General Awareness",
  "Computer Knowledge",
  "Mixed Mock Test",
];

const EXAM_TERMS = [
  { name: "IBPS PO", terms: ["ibps po", "probationary officer"] },
  { name: "IBPS Clerk", terms: ["ibps clerk", "customer service"] },
  { name: "RRB PO", terms: ["rrb po", "officer scale i"] },
  {
    name: "RRB Assistant",
    terms: ["rrb assistant", "office assistant", "rrb clerk"],
  },
  { name: "SBI PO / Clerk", terms: ["sbi po", "sbi clerk", "sbi"] },
  { name: "RBI Exams", terms: ["rbi", "reserve bank"] },
];

function isFullMock(paper: SavedPaper) {
  const value = `${paper.title} ${paper.section}`.toLowerCase();

  return (
    value.includes("full mock") ||
    value.includes("full-length") ||
    value.includes("full length") ||
    value.includes("complete mock") ||
    value.includes("mixed mock")
  );
}

function examOf(paper: SavedPaper) {
  const value = `${paper.title} ${paper.section}`.toLowerCase();

  return EXAM_TERMS.find((item) =>
    item.terms.some((term) => value.includes(term))
  )?.name;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "Unknown date";

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function readProfile(): UserProfile | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "null"
    );

    return value?.displayName ? value : null;
  } catch {
    return null;
  }
}

function questionSummaries(value: unknown): QuestionSummary[] {
  if (!Array.isArray(value)) return [];

  return value.map((question: unknown, index: number) => {
    const item = question as Record<string, unknown>;

    return {
      questionNumber:
        Number(item.questionNumber ?? item.question_number) || index + 1,
    };
  });
}

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: "book" | "search" | "plus" | "play" | "edit" | "trash" | "clock";
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M12 7v14m0-14C9 4 5 4 3 5v14c3-1 6-1 9 2m0-14c3-3 7-3 9-2v14c-3-1-6-1-9 2" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

function LibraryInner() {
  const searchParams = useSearchParams();
  const examFromUrl = searchParams.get("exam") || "All exams";

  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [search, setSearch] = useState("");
  const [section, setSection] = useState("All");
  const [exam, setExam] = useState(examFromUrl);
  const [tab, setTab] = useState<Tab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("papers")
        .select(
          "id, title, section, minutes, questions, created_at, is_published"
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPapers(
        (data ?? []).map((row) => ({
          id: String(row.id),
          title: row.title || "Untitled Paper",
          section: row.section || "Mixed Mock Test",
          minutes: Number(row.minutes) || 20,
          questions: questionSummaries(row.questions),
          savedAt: row.created_at
            ? new Date(row.created_at).getTime()
            : Date.now(),
          is_published: Boolean(row.is_published),
        }))
      );
    } catch (error) {
      console.error("Failed to load published papers:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load published papers from Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function checkAdmin() {
      setCheckingAdmin(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        setIsAdmin(!error && data?.role === "admin");
      } catch (error) {
        console.error("Unable to check administrator role:", error);

        if (active) setIsAdmin(false);
      } finally {
        if (active) setCheckingAdmin(false);
      }
    }

    void checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setProfile(readProfile());
  }, []);

  useEffect(() => {
    setExam(examFromUrl);
  }, [examFromUrl]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setPage(1);
  }, [search, section, exam, tab, sortBy]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = papers.filter((paper) => {
      const matchesSearch =
        !query ||
        `${paper.title} ${paper.section}`.toLowerCase().includes(query);

      const matchesSection =
        section === "All" || paper.section === section;

      const matchesExam =
        exam === "All exams" || examOf(paper) === exam;

      const matchesTab =
        tab === "all" ||
        (tab === "full" && isFullMock(paper)) ||
        (tab === "section" && !isFullMock(paper));

      return (
        matchesSearch &&
        matchesSection &&
        matchesExam &&
        matchesTab
      );
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return b.savedAt - a.savedAt;
      if (sortBy === "oldest") return a.savedAt - b.savedAt;

      if (sortBy === "title") {
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      }

      return b.questions.length - a.questions.length;
    });

    return result;
  }, [papers, search, section, exam, tab, sortBy]);

  const totalQuestions = papers.reduce(
    (sum, paper) => sum + paper.questions.length,
    0
  );

  const fullMockCount = papers.filter(isFullMock).length;
  const sectionalCount = papers.length - fullMockCount;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const hasActiveFilters =
    Boolean(search) ||
    section !== "All" ||
    exam !== "All exams" ||
    tab !== "all" ||
    sortBy !== "newest";

  async function deletePaper(id: string) {
    if (!isAdmin || checkingAdmin) {
      window.alert("Only administrators can delete papers.");
      return;
    }

    const paper = papers.find((item) => item.id === id);

    if (
      !window.confirm(
        `Delete "${paper?.title || "this paper"}" permanently?`
      )
    ) {
      return;
    }

    setDeletingId(id);
    setLoadError("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("papers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPapers((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete paper:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not delete this paper."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setSection("All");
    setExam("All exams");
    setTab("all");
    setSortBy("newest");
  }

  return (
    <Shell profile={profile} active="library">
      <main className="mx-auto max-w-6xl space-y-7 pb-12">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              <Icon name="book" />
              Assessment repository
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Mock Test Library
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {loading ? (
                "Loading published papers..."
              ) : (
                <>
                  <strong className="text-slate-900">{papers.length}</strong>{" "}
                  published papers
                  <span className="mx-2 text-slate-300">·</span>
                  <strong className="text-slate-900">
                    {totalQuestions.toLocaleString()}
                  </strong>{" "}
                  questions
                  <span className="mx-2 text-slate-300">·</span>
                  <strong className="text-indigo-600">{filtered.length}</strong>{" "}
                  matching results
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadLibrary()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            {!checkingAdmin && isAdmin && (
              <Link
                href="/importer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Icon name="plus" />
                Import paper
              </Link>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Published papers" value={papers.length} />
          <SummaryCard label="Full-length mocks" value={fullMockCount} />
          <SummaryCard label="Sectional tests" value={sectionalCount} />
        </section>

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <p className="font-bold">Could not load or update the library</p>
            <p className="mt-1 break-words">{loadError}</p>
            <p className="mt-2 text-xs">
              Verify the Supabase `papers` table, the `is_published` value, and
              your SELECT/DELETE RLS policies.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {(
              [
                ["all", "All papers"],
                ["full", "Full mocks"],
                ["section", "Sectional practice"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  tab === value
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            {totalQuestions.toLocaleString()} questions available
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Icon name="search" />
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search papers..."
                aria-label="Search papers"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              aria-label="Filter by subject"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              {SECTIONS.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All subjects" : item}
                </option>
              ))}
            </select>

            <select
              value={exam}
              onChange={(event) => setExam(event.target.value)}
              aria-label="Filter by exam"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="All exams">All target exams</option>
              {EXAM_TERMS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as SortBy)
              }
              aria-label="Sort papers"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
              <option value="questions">Most questions</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                Filters are active
              </span>

              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Loading published papers...
            </p>
          </div>
        ) : pageItems.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {pageItems.map((paper) => {
                const fullMock = isFullMock(paper);
                const examName = examOf(paper);

                return (
                  <li
                    key={paper.id}
                    className="flex flex-col justify-between gap-4 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          {paper.title}
                        </h2>

                        <span
                          className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
                            fullMock
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {fullMock ? "Full mock" : "Sectional"}
                        </span>

                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Published
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        {examName && (
                          <>
                            <span className="font-semibold text-slate-700">
                              {examName}
                            </span>
                            <span>·</span>
                          </>
                        )}

                        <span>{paper.section}</span>
                        <span>·</span>
                        <span>{paper.questions.length} questions</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Icon name="clock" className="h-3.5 w-3.5" />
                          {paper.minutes} mins
                        </span>
                        <span>·</span>
                        <span>{formatDate(paper.savedAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {!checkingAdmin && isAdmin && (
                        <Link
                          href={`/admin/papers/${encodeURIComponent(
                            paper.id
                          )}/edit`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Icon name="edit" />
                          Edit
                        </Link>
                      )}

                      <Link
                        href={`/exam/${encodeURIComponent(paper.id)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                      >
                        <Icon name="play" />
                        Start test
                      </Link>

                      {!checkingAdmin && isAdmin && (
                        <button
                          type="button"
                          disabled={deletingId === paper.id}
                          onClick={() => void deletePaper(paper.id)}
                          title="Delete paper"
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Icon name="book" className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {papers.length === 0
                ? "No published papers yet"
                : "No matching papers"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {papers.length === 0
                ? "Papers will appear here after an administrator publishes them in Supabase."
                : "Try changing your search text or filters."}
            </p>

            {papers.length === 0 && (
              <button
                type="button"
                onClick={() => void loadLibrary()}
                className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Refresh library
              </button>
            )}

            {!checkingAdmin && isAdmin && papers.length === 0 && (
              <Link
                href="/importer"
                className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Icon name="plus" />
                Import a paper
              </Link>
            )}
          </section>
        )}

        {totalPages > 1 && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              ← Previous
            </button>

            <span className="text-sm text-slate-500">
              Page <strong>{safePage}</strong> of{" "}
              <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </footer>
        )}
      </main>
    </Shell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading mock library...
        </main>
      }
    >
      <LibraryInner />
    </Suspense>
  );
}