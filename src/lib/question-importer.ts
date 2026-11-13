
export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export type ImportedQuestion = {
  id: string;
  questionNumber: number;
  /** Shared passage, puzzle premise, or directions */
  context?: string;
  question: string;
  options: Record<OptionLetter, string>;
  correctAnswer: OptionLetter | null;
  explanation?: string;
};

export type ParseResult = {
  questions: ImportedQuestion[];
  errors: string[];
  unmatchedAnswerNumbers: number[];
};

const LETTERS: OptionLetter[] = ["A", "B", "C", "D", "E"];

export const EMPTY_OPTIONS = (): Record<OptionLetter, string> => ({
  A: "",
  B: "",
  C: "",
  D: "",
  E: "",
});

function normalizeText(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[ \t]+(?=\n)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/* =======================================================
   ANSWER KEY PARSER
   Supports:
   1-E, 1. E, 1) E, Q1. E, 1: E, 1 = E, 1 -> E
   Also supports one answer letter per line.
   ======================================================= */

export function parseAnswerKey(
  input: string
): Map<number, OptionLetter> {
  const answers = new Map<number, OptionLetter>();
  const text = normalizeText(input);

  if (!text) return answers;

  const explicitRegex =
    /(?:^|[\n,;\t|])\s*(?:Q(?:uestion)?\.?\s*)?(\d{1,3})\s*(?:->|[.):=-])?\s*\(?\s*([A-E])\s*\)?(?=\s*(?:$|[\n,;\t|]))/gim;

  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(text)) !== null) {
    const number = Number(match[1]);
    const answer = match[2].toUpperCase() as OptionLetter;

    if (number > 0 && LETTERS.includes(answer)) {
      answers.set(number, answer);
    }
  }

  if (answers.size === 0) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let sequentialNumber = 1;

    for (const line of lines) {
      const singleLetter = line.match(/^\(?([A-E])\)?[.)]?$/i);

      if (singleLetter) {
        answers.set(
          sequentialNumber++,
          singleLetter[1].toUpperCase() as OptionLetter
        );
      }
    }
  }

  return answers;
}

/* =======================================================
   QUESTION BLOCK EXTRACTION
   ======================================================= */

type RawBlock = {
  number: number;
  context?: string;
  body: string;
};

const QUESTION_PREFIX =
  /^(?:(?:Question|Q)\.?\s*)?(\d{1,3})\s*[.)\]:-]\s*(.*)$/i;

const CONTEXT_HEADER =
  /^(?:(?:Directions?|Passage)\b|Read the following\b|Study the following\b|On the basis of the following\b|Following information\b)/i;

/**
 * Finds a common repeated puzzle/passage premise.
 *
 * Examples:
 * Eight persons A, B, C, D, E, F, G and H sit around...
 * Five boxes are placed on different floors...
 * Study the following information...
 *
 * This pattern is used for cleaning leaked text from options.
 */
const PREMISE_START =
  /\b(?:Eight|Seven|Six|Five|Four|Three|Two|Nine|Ten|\d+)\s+(?:persons?|people|friends?|boxes|books|floors?|cars?|students?|candidates?|objects?|machines?|days?|months?)\b[\s\S]{0,220}?\b(?:sit|sits|are seated|were seated|stand|stands|live|lives|are arranged|were arranged|are placed|were placed|are kept|were kept|work|works)\b|\b(?:Study|Read)\s+the\s+following\b|\bDirections?\s*(?:\(|:)|\bA\s+certain\s+number\s+of\s+(?:persons?|people|boxes|objects?)\b/i;

function isQuestionStart(
  line: string
): { number: number; rest: string } | null {
  const match = line.trim().match(QUESTION_PREFIX);

  if (!match) return null;

  const number = Number(match[1]);
  const rest = match[2].trim();

  if (number < 1 || number > 300 || !rest) return null;

  return { number, rest };
}

function extractBlocksWithContext(input: string): RawBlock[] {
  const text = normalizeText(input);

  if (!text) return [];

  const lines = text.split("\n");
  const blocks: RawBlock[] = [];

  let currentContext = "";
  let currentNumber: number | null = null;
  let currentBody: string[] = [];
  let contextMode = false;

  function flushQuestion() {
    if (currentNumber !== null && currentBody.length > 0) {
      const body = currentBody.join("\n").trim();

      if (body) {
        blocks.push({
          number: currentNumber,
          context: currentContext.trim() || undefined,
          body,
        });
      }
    }

    currentNumber = null;
    currentBody = [];
  }

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      if (currentNumber !== null) {
        currentBody.push("");
      } else if (contextMode && currentContext) {
        currentContext += "\n";
      }

      continue;
    }

    // Explicit directions or passage heading.
    if (CONTEXT_HEADER.test(line)) {
      flushQuestion();
      currentContext = line;
      contextMode = true;
      continue;
    }

    const questionStart = isQuestionStart(line);

    if (questionStart) {
      flushQuestion();

      currentNumber = questionStart.number;
      currentBody = [questionStart.rest];
      contextMode = false;
      continue;
    }

    if (currentNumber !== null) {
      currentBody.push(line);
    } else if (contextMode) {
      currentContext += `\n${line}`;
    } else {
      currentContext = currentContext
        ? `${currentContext}\n${line}`
        : line;
    }
  }

  flushQuestion();

  if (blocks.length === 0 && text) {
    return [{ number: 1, body: text }];
  }

  return blocks;
}

/* =======================================================
   OPTION MARKER DETECTION
   Supports:
   A) Option text
   A. Option text
   (A) Option text
   [A] Option text
   ======================================================= */

type OptionMarker = {
  index: number;
  end: number;
  letter: OptionLetter;
};

function findOptionMarkers(body: string): OptionMarker[] {
  const regex =
    /(?:^|[\n\s])(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[.)])(?=\s+)/g;

  const candidates: OptionMarker[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    const rawLetter = (
      match[1] ||
      match[2] ||
      match[3]
    ).toUpperCase() as OptionLetter;

    const leadingWhitespace =
      match[0].match(/^\s*/)?.[0].length ?? 0;

    candidates.push({
      index: match.index + leadingWhitespace,
      end: match.index + match[0].length,
      letter: rawLetter,
    });
  }

  const firstA = candidates.findIndex(
    (candidate) => candidate.letter === "A"
  );

  if (firstA < 0) return [];

  const ordered: OptionMarker[] = [];
  let expectedIndex = 0;

  for (const candidate of candidates.slice(firstA)) {
    if (LETTERS[expectedIndex] !== candidate.letter) {
      continue;
    }

    ordered.push(candidate);
    expectedIndex++;

    if (expectedIndex === LETTERS.length) break;
  }

  return ordered.length >= 2 ? ordered : [];
}

/* =======================================================
   CLEAN REPEATED PASSAGES FROM OPTIONS
   ======================================================= */

/**
 * Returns the start of a repeated passage within option text.
 *
 * Example:
 * "Third to the right Eight persons A, B, C, D, E, F, G and H
 * sit around a square table..."
 *
 * Returns the index of "Eight persons", leaving "Third to the right".
 */
function findPremiseBleed(text: string): number {
  const match = PREMISE_START.exec(text);

  if (!match || match.index === undefined) {
    return -1;
  }

  // Do not remove text if the premise starts at the beginning
  // of the option: it may genuinely be the option's content.
  if (match.index < 3) {
    return -1;
  }

  return match.index;
}

function truncateTrailingBleed(
  optionText: string
): {
  cleanText: string;
  explanation?: string;
  leakedContext?: string;
} {
  let clean = optionText.trim();
  let explanation: string | undefined;
  let leakedContext: string | undefined;

  // Remove explanation text if appended to the final option.
  const explanationRegex =
    /(?:^|\n)\s*(?:Ans(?:wer)?|Explanation|Solution|Sol)\s*[:.-]\s*([\s\S]*)$/i;

  const explanationMatch = explanationRegex.exec(clean);

  if (
    explanationMatch &&
    explanationMatch.index !== undefined
  ) {
    explanation = explanationMatch[1].trim();
    clean = clean.slice(0, explanationMatch.index).trim();
  }

  // Remove a repeated premise even if it appears on the same line.
  const premiseIndex = findPremiseBleed(clean);

  if (premiseIndex >= 0) {
    leakedContext = clean.slice(premiseIndex).trim();
    clean = clean.slice(0, premiseIndex).trim();
  }

  // Remove a clearly embedded next numbered question.
  const nextQuestionRegex =
    /(?:^|\n)\s*(?:(?:Question|Q)\.?\s*)?\d{1,3}\s*[.)\]:-]\s+/i;

  const nextQuestionMatch = nextQuestionRegex.exec(clean);

  if (
    nextQuestionMatch &&
    nextQuestionMatch.index > 0
  ) {
    clean = clean.slice(0, nextQuestionMatch.index).trim();
  }

  return {
    cleanText: clean,
    explanation,
    leakedContext,
  };
}

/* =======================================================
   QUESTION BODY PARSER
   ======================================================= */

type ParsedBody = {
  context?: string;
  question: string;
  options: Record<OptionLetter, string>;
  explanation?: string;
  errors: string[];
};

function parseQuestionBody(
  body: string,
  inheritedContext?: string
): ParsedBody {
  const options = EMPTY_OPTIONS();
  const errors: string[] = [];
  const markers = findOptionMarkers(body);

  if (markers.length === 0) {
    return {
      context: inheritedContext,
      question: cleanText(body),
      options,
      errors: [
        "No ordered option sequence (A, B, ...) was detected.",
      ],
    };
  }

  let rawStem = body.slice(0, markers[0].index).trim();
  let context = inheritedContext;
  let explanation: string | undefined;

  // Move an explicitly headed directions paragraph to context.
  const paragraphs = rawStem
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (
    paragraphs.length > 1 &&
    CONTEXT_HEADER.test(paragraphs[0])
  ) {
    const detectedContext = paragraphs.shift()!;

    context = context
      ? `${context}\n\n${detectedContext}`
      : detectedContext;

    rawStem = paragraphs.join("\n\n");
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const isLast = i === markers.length - 1;

    const end = isLast
      ? body.length
      : markers[i + 1].index;

    const rawValue = body.slice(marker.end, end).trim();

    if (isLast) {
      const result = truncateTrailingBleed(rawValue);

      options[marker.letter] = cleanText(result.cleanText);
      explanation = result.explanation;

      /*
       * Do not append leakedContext to the existing context.
       * In this bug, the shared context already contains the same
       * passage, so appending it would duplicate the directions.
       */
    } else {
      options[marker.letter] = cleanText(rawValue);
    }
  }

  const filledOptions = LETTERS.filter(
    (letter) => options[letter].trim().length > 0
  );

  if (filledOptions.length < 2) {
    errors.push("Fewer than two non-empty options were detected.");
  }

  return {
    context: context?.trim() || undefined,
    question: cleanText(rawStem),
    options,
    explanation,
    errors,
  };
}

/* =======================================================
   MAIN EXPORT
   ======================================================= */

export function parsePaper(
  paperText: string,
  answerKeyText: string,
  _section = "Quantitative Aptitude"
): ParseResult {
  const errors: string[] = [];
  const answerMap = parseAnswerKey(answerKeyText);
  const rawBlocks = extractBlocksWithContext(paperText);
  const questions: ImportedQuestion[] = [];
  const seenNumbers = new Set<number>();

  for (const block of rawBlocks) {
    const parsed = parseQuestionBody(block.body, block.context);

    if (!parsed.question && !parsed.context) {
      errors.push(
        `Question ${block.number}: No question text was detected.`
      );
      continue;
    }

    if (seenNumbers.has(block.number)) {
      errors.push(
        `Duplicate question number detected: Q${block.number}.`
      );
    }

    seenNumbers.add(block.number);

    for (const error of parsed.errors) {
      errors.push(`Question ${block.number}: ${error}`);
    }

    const filledOptions = LETTERS.filter(
      (letter) => parsed.options[letter].trim().length > 0
    );

    if (filledOptions.length < 5) {
      errors.push(
        `Question ${block.number}: ${filledOptions.length}/5 options detected. Review the imported question.`
      );
    }

    questions.push({
      id: `q-${block.number}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
      questionNumber: block.number,
      context: parsed.context,
      question: parsed.question,
      options: parsed.options,
      correctAnswer: answerMap.get(block.number) ?? null,
      explanation: parsed.explanation,
    });
  }

  if (questions.length === 0 && paperText.trim()) {
    errors.push(
      "No numbered questions were detected. Start questions with 1., 2), Q1., or Question 1:."
    );
  }

  const parsedNumbers = new Set(
    questions.map((question) => question.questionNumber)
  );

  const unmatchedAnswerNumbers = [...answerMap.keys()].filter(
    (number) => !parsedNumbers.has(number)
  );

  for (const question of questions) {
    if (!question.correctAnswer) {
      errors.push(
        `Question ${question.questionNumber}: No answer-key entry was matched.`
      );
    }
  }

  questions.sort(
    (a, b) => a.questionNumber - b.questionNumber
  );

  return {
    questions,
    errors,
    unmatchedAnswerNumbers,
  };
}
