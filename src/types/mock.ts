export const DEFAULT_SECTIONS = [
  { id: "english", name: "English Language", durationMinutes: 20 },
  { id: "quant", name: "Quantitative Aptitude", durationMinutes: 20 },
  { id: "reasoning", name: "Reasoning Ability", durationMinutes: 20 },
] as const;

export type SectionId = string;
export type TimerMode = "total" | "section" | "untimed";
export type QuestionStatus = "unanswered" | "answered" | "marked" | "answered-marked";

export type Option = { id: string; text: string };
export type Question = {
  id: string;
  sectionId: SectionId;
  topic: string;
  text: string;
  options: Option[];
  correctOptionId: string;
  explanation?: string;
  marks: number;
  negativeMarks: number;
};

export type ExamSection = {
  id: string;
  name: string;
  durationMinutes: number;
};

export type MockConfig = {
  title: string;
  exam: string;
  timerMode: TimerMode;
  totalDurationMinutes: number;
  sections: ExamSection[];
  strictSectionLock: boolean;
  allowSectionNavigation: boolean;
};

export type StoredAttempt = {
  id: string;
  config: MockConfig;
  questionIds: string[];
  answers: Record<string, string>;
  markedQuestionIds: string[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  startedAt: number;
  totalDeadline: number | null;
  sectionStartedAt: number;
  sectionDeadline: number | null;
  status: "in-progress" | "submitted";
  updatedAt: number;
};

export type QuestionBankRecord = Question & {
  exam: string;
  year?: number;
  sourcePaper?: string;
  verified: boolean;
  createdAt: number;
};
