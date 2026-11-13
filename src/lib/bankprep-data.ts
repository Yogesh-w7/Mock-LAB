
export type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: { questionNumber: number }[];
  savedAt: number;
};


export type AttemptRecord = {
  id: string;
  paperId?: string;
  title: string;
  section: string;
  date: number;
  score: number;
  correct: number;
  wrong: number;
  attempted: number;
  total: number;
  accuracy: number;
  durationSeconds: number;

  // Additional activity statistics
  speed?: number;
  unanswered?: number;
};


export type UserProfile = {
  id: string;
  displayName: string;
  targetExam: string;
  targetScore: number;
  dailyGoalMinutes: number;
  avatarHue: number;
};

export const PAPERS_KEY = "ibps-mock-saved-papers-v1";
export const ATTEMPTS_KEY = "ibps-mock-attempt-history-v1";
export const PROFILE_KEY = "ibps-mock-user-profile-v1";

export const exams = [
  {
    name: "IBPS PO",
    subtitle: "Probationary Officer",
    terms: ["ibps po", "probationary officer"],
  },
  {
    name: "IBPS Clerk",
    subtitle: "Customer Service Associate",
    terms: ["ibps clerk", "ibps customer service"],
  },
  {
    name: "RRB PO",
    subtitle: "Officer Scale I",
    terms: ["rrb po", "officer scale i", "regional rural bank po"],
  },
  {
    name: "RRB Assistant",
    subtitle: "Office Assistant",
    terms: ["rrb assistant", "office assistant", "rrb clerk"],
  },
  {
    name: "SBI PO / Clerk",
    subtitle: "State Bank of India",
    terms: ["sbi po", "sbi clerk", "sbi"],
  },
  {
    name: "RBI Exams",
    subtitle: "Assistant and other exams",
    terms: ["rbi", "reserve bank"],
  },
] as const;

export const subjects = [
  {
    name: "Quantitative Aptitude",
    short: "QUANT",
    description: "Arithmetic, DI and calculations",
    icon: "∑",
  },
  {
    name: "Reasoning Ability",
    short: "REASONING",
    description: "Puzzles and logical reasoning",
    icon: "◇",
  },
  {
    name: "English Language",
    short: "ENGLISH",
    description: "Reading comprehension, grammar and vocabulary",
    icon: "Aa",
  },
  {
    name: "General Awareness",
    short: "AWARENESS",
    description: "Banking, static GK and current affairs",
    icon: "◎",
  },
  {
    name: "Computer Knowledge",
    short: "COMPUTER",
    description: "Computer fundamentals and digital awareness",
    icon: "⌘",
  },
] as const;

export function readStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(
      window.localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(PROFILE_KEY);

    if (!value) return null;

    const profile = JSON.parse(value);

    return profile?.displayName
      ? (profile as UserProfile)
      : null;
  } catch {
    return null;
  }
}

export function getQuestionCount(paper: SavedPaper) {
  return Array.isArray(paper.questions)
    ? paper.questions.length
    : 0;
}

export function isFullMock(paper: SavedPaper) {
  const title = (paper.title || "").toLowerCase();
  const section = (paper.section || "").toLowerCase();

  return (
    title.includes("full mock") ||
    title.includes("full-length") ||
    title.includes("full length") ||
    title.includes("complete mock") ||
    section.includes("mixed mock")
  );
}

export function getExamForPaper(paper: SavedPaper) {
  const value =
    `${paper.title || ""} ${paper.section || ""}`.toLowerCase();

  return exams.find((exam) =>
    exam.terms.some((term) => value.includes(term))
  );
}

export function formatDate(timestamp: number) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "Unknown date";
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
