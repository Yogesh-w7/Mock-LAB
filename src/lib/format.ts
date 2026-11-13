
/**
 * Converts common math / LaTeX-like fragments into readable Unicode
 * for IBPS-style question text.
 */
export function formatInlineMath(value: string): string {
  if (!value) return "";

  const superscript: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    "(": "⁽",
    ")": "⁾",
    n: "ⁿ",
    x: "ˣ",
    y: "ʸ",
    i: "ⁱ",
  };

  const subscript: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
  };

  const fractions: Record<string, string> = {
    "1/2": "½",
    "1/3": "⅓",
    "2/3": "⅔",
    "1/4": "¼",
    "3/4": "¾",
    "1/5": "⅕",
    "2/5": "⅖",
    "3/5": "⅗",
    "4/5": "⅘",
    "1/6": "⅙",
    "5/6": "⅚",
    "1/8": "⅛",
    "3/8": "⅜",
    "5/8": "⅝",
    "7/8": "⅞",
  };

  let result = value;

  // Convert common LaTeX commands.
  result = result
    .replace(/\\times\b/g, "×")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\leq?\b/g, "≤")
    .replace(/\\geq?\b/g, "≥")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pi\b/g, "π")
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)")
    .replace(/\\%/g, "%");

  // Convert simple powers, such as x^{2} or 10^3.
  result = result.replace(
    /(\w)\^\{([^{}]+)\}|\b(\w)\^(\w+)/g,
    (_match, base1, exp1, base2, exp2) => {
      const base = base1 ?? base2;
      const exponent = exp1 ?? exp2;

      const converted = [...String(exponent)]
        .map((char) => superscript[char] ?? char)
        .join("");

      return `${base}${converted}`;
    }
  );

  // Convert simple subscripts, such as x_{2} or a_1.
  result = result.replace(
    /(\w)_\{([^{}]+)\}|(\w)_(\w+)/g,
    (_match, base1, sub1, base2, sub2) => {
      const base = base1 ?? base2;
      const sub = sub1 ?? sub2;

      const converted = [...String(sub)]
        .map((char) => subscript[char] ?? char)
        .join("");

      return `${base}${converted}`;
    }
  );

  // Convert common numeric fractions without altering arbitrary ratios.
  for (const [fraction, symbol] of Object.entries(fractions)) {
    const escaped = fraction.replace("/", "\\/");
    result = result.replace(
      new RegExp(`(^|\\s)${escaped}(?=\\s|$|[.,;!?])`, "g"),
      (_match, prefix: string) => `${prefix}${symbol}`
    );
  }

  // Remove common inline math delimiters.
  result = result
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\$(.*?)\$/g, "$1");

  return result;
}
