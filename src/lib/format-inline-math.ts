
export function formatInlineMath(
  value: string | null | undefined
): string {
  if (!value) return "";

  let text = String(value);

  const superscript: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  };

  const fractions: Record<string, string> = {
    "1/2": "½", "1/3": "⅓", "2/3": "⅔",
    "1/4": "¼", "3/4": "¾", "1/5": "⅕",
    "2/5": "⅖", "3/5": "⅗", "4/5": "⅘",
    "1/6": "⅙", "5/6": "⅚", "1/8": "⅛",
    "3/8": "⅜", "5/8": "⅝", "7/8": "⅞",
  };

  const toSuper = (s: string) =>
    [...s].map((c) => superscript[c] ?? c).join("");

  // Remove math delimiters and LaTeX sizing commands.
  text = text
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\$\$?/g, "")
    .replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, "");

  // Handle indexed roots FIRST.
  // \sqrt[3]{343} -> ∛(343)
  // \sqrt[4]{16}  -> ∜(16)
  text = text.replace(
    /\\sqrt\s*\[\s*([^\]]+?)\s*\]\s*\{([^{}]+)\}/g,
    (_match, index: string, expression: string) => {
      const n = index.trim();
      const radicand = expression.trim();

      if (n === "2") return `√(${radicand})`;
      if (n === "3") return `∛(${radicand})`;
      if (n === "4") return `∜(${radicand})`;

      return `${toSuper(n)}√(${radicand})`;
    }
  );

  // Square roots.
  text = text.replace(
    /\\sqrt\s*\{([^{}]+)\}/g,
    (_match, expression: string) => `√(${expression.trim()})`
  );

  // Fractions.
  text = text.replace(
    /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
    (_match, numerator: string, denominator: string) => {
      const key = `${numerator.trim()}/${denominator.trim()}`;

      return fractions[key] ??
        `(${numerator.trim()}/${denominator.trim()})`;
    }
  );

  const replacements: Array<[RegExp, string]> = [
    [/\\times\b/g, "×"],
    [/\\div\b/g, "÷"],
    [/\\cdot\b/g, "·"],
    [/\\pm\b/g, "±"],
    [/\\mp\b/g, "∓"],
    [/\\leq\b|\\le\b/g, "≤"],
    [/\\geq\b|\\ge\b/g, "≥"],
    [/\\neq\b|\\ne\b/g, "≠"],
    [/\\approx\b/g, "≈"],
    [/\\infty\b/g, "∞"],
    [/\\pi\b/g, "π"],
    [/\\theta\b/g, "θ"],
    [/\\alpha\b/g, "α"],
    [/\\beta\b/g, "β"],
    [/\\gamma\b/g, "γ"],
    [/\\delta\b/g, "δ"],
    [/\\lambda\b/g, "λ"],
    [/\\mu\b/g, "μ"],
    [/\\sigma\b/g, "σ"],
    [/\\%/g, "%"],
    [/\\text\s*\{([^{}]*)\}/g, "$1"],
    [/\\mathrm\s*\{([^{}]*)\}/g, "$1"],
    [/\\[,;:]|\\quad\b|\\qquad\b/g, " "],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  // Superscripts.
  text = text.replace(
    /\^\s*\{([^{}]+)\}/g,
    (_match, exponent: string) => toSuper(exponent)
  );

  text = text.replace(
    /\^\s*([0-9])/g,
    (_match, exponent: string) => toSuper(exponent)
  );

  // Remove leftover commands and braces.
  return text
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
