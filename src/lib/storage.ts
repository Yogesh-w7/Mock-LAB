
import type { OptionLetter } from "./question-importer";

export type QuestionWithImage = {
  id: string;
  questionNumber: number;
  question: string;
  context?: string;
  options: Partial<Record<OptionLetter, string>>;
  correctAnswer: OptionLetter | null;
  imageDataUrl?: string;
};

/**
 * Configuration for an individual exam section.
 */
export type ExamSectionConfig = {
  key: string;
  title: string;
  minutes: number;
  questionNumbers: number[];
};

/**
 * Configuration for a full mock or sectional test.
 */
export type ExamConfig = {
  mode: "full" | "sectional";
  sections: ExamSectionConfig[];
};

/**
 * A saved question paper.
 *
 * examConfig is optional for backward compatibility.
 */
export type SavedPaper = {
  id: string;
  title: string;
  section: string;
  minutes: number;
  questions: QuestionWithImage[];
  paperText: string;
  answerKeyText: string;
  savedAt: number;
  examConfig?: ExamConfig;
};

export type AttemptRecord = {
  id: string;
  paperId: string;
  title: string;
  section: string;
  date: number;
  score: number;
  correct: number;
  wrong: number;
  unanswered: number;
  attempted: number;
  total: number;
  accuracy: number;
  durationSeconds: number;
  speed: number;
  answers: Record<number, OptionLetter>;
  marked: number[];
};

export const SAVED_PAPERS_KEY = "ibps-mock-saved-papers-v1";
export const ATTEMPT_HISTORY_KEY = "ibps-mock-attempt-history-v1";
export const LAST_ATTEMPT_KEY = "ibps-mock-last-attempt-v1";

/**
 * Read saved papers from browser local storage.
 */
export function readSavedPapers(): SavedPaper[] {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const value = JSON.parse(
      localStorage.getItem(SAVED_PAPERS_KEY) || "[]"
    );

    if (!Array.isArray(value)) {
      return [];
    }

    return value as SavedPaper[];
  } catch {
    return [];
  }
}

/**
 * Save papers to browser local storage.
 */
export function writeSavedPapers(papers: SavedPaper[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    SAVED_PAPERS_KEY,
    JSON.stringify(papers)
  );
}

/**
 * Find one saved paper by its ID.
 */
export function getPaperById(id: string): SavedPaper | null {
  return readSavedPapers().find((paper) => paper.id === id) ?? null;
}

/**
 * Read completed exam attempts.
 */
export function readAttempts(): AttemptRecord[] {
  try {
    if (typeof window === "undefined") {
      return [];
    }

    const value = JSON.parse(
      localStorage.getItem(ATTEMPT_HISTORY_KEY) || "[]"
    );

    if (!Array.isArray(value)) {
      return [];
    }

    return value as AttemptRecord[];
  } catch {
    return [];
  }
}

/**
 * Save completed exam attempts.
 */
export function writeAttempts(attempts: AttemptRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    ATTEMPT_HISTORY_KEY,
    JSON.stringify(attempts)
  );
}

/**
 * Find one attempt by its ID.
 */
export function getAttemptById(id: string): AttemptRecord | null {
  return readAttempts().find((attempt) => attempt.id === id) ?? null;
}

/**
 * Save the most recently completed attempt.
 */
export function saveLastAttempt(attempt: AttemptRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    LAST_ATTEMPT_KEY,
    JSON.stringify(attempt)
  );
}

/**
 * Read the most recently completed attempt.
 */
export function readLastAttempt(): AttemptRecord | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const value = localStorage.getItem(LAST_ATTEMPT_KEY);

    return value ? (JSON.parse(value) as AttemptRecord) : null;
  } catch {
    return null;
  }
}

/**
 * Calculate the total duration of a full mock.
 *
 * Falls back to the paper's original minutes for older
 * papers that do not have section configuration.
 */
export function getPaperDurationMinutes(paper: SavedPaper): number {
  const sections = paper.examConfig?.sections;

  if (sections && sections.length > 0) {
    return sections.reduce(
      (total, section) => total + Math.max(0, section.minutes),
      0
    );
  }

  return Math.max(1, paper.minutes || 1);
}

/**
 * Get the section configuration for a paper.
 *
 * Older single-section papers are supported automatically.
 */
export function getPaperSections(
  paper: SavedPaper
): ExamSectionConfig[] {
  const sections = paper.examConfig?.sections;

  if (sections && sections.length > 0) {
    return sections;
  }

  return [
    {
      key: "section-1",
      title: paper.section,
      minutes: Math.max(1, paper.minutes || 1),
      questionNumbers: paper.questions.map(
        (question) => question.questionNumber
      ),
    },
  ];
}
