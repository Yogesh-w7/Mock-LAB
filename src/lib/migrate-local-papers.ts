"use client";

import { createClient } from "@/lib/supabase/client";

const LOCAL_PAPERS_KEY = "ibps-mock-saved-papers-v1";
const MIGRATION_MARKER = "ibps-local-papers-migration-v1";

const MAX_PAPERS_TO_MIGRATE = 4;

type LegacyPaper = {
  id?: string;
  title?: string;
  section?: string;
  minutes?: number;
  questions?: unknown[];
  paperText?: string;
  paper_text?: string;
  answerKeyText?: string;
  answer_key_text?: string;
  savedAt?: number;
};

export type MigrationResult = {
  migrated: number;
  skipped: number;
  errors: string[];
  alreadyCompleted?: boolean;
};

export async function migrateFourLocalPapers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  // Prevent accidental repeat runs in this browser.
  if (localStorage.getItem(MIGRATION_MARKER) === "completed") {
    return {
      ...result,
      alreadyCompleted: true,
    };
  }

  const raw = localStorage.getItem(LOCAL_PAPERS_KEY);

  if (!raw) {
    result.errors.push("No old localStorage papers were found.");
    return result;
  }

  let legacyPapers: LegacyPaper[];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Saved papers must be an array.");
    }

    // Only consider the first four legacy records.
    legacyPapers = (parsed as LegacyPaper[]).slice(
      0,
      MAX_PAPERS_TO_MIGRATE
    );
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : "Could not parse local papers."
    );
    return result;
  }

  if (legacyPapers.length === 0) {
    result.errors.push("There are no legacy papers to migrate.");
    return result;
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    result.errors.push("Sign in as an administrator first.");
    return result;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    result.errors.push("Only an administrator can migrate papers.");
    return result;
  }

  // Read existing rows so legacy papers already present are not duplicated.
  const { data: existingPapers, error: existingError } = await supabase
    .from("papers")
    .select("id, title");

  if (existingError) {
    result.errors.push(
      `Could not check existing Supabase papers: ${existingError.message}`
    );
    return result;
  }

  const existingIds = new Set(
    (existingPapers ?? []).map((paper) => String(paper.id))
  );

  const existingTitles = new Set(
    (existingPapers ?? []).map((paper) =>
      String(paper.title || "").trim().toLowerCase()
    )
  );

  for (let index = 0; index < legacyPapers.length; index++) {
    const legacy = legacyPapers[index];

    if (
      !legacy ||
      !legacy.title?.trim() ||
      !Array.isArray(legacy.questions) ||
      legacy.questions.length === 0
    ) {
      result.skipped++;
      result.errors.push(`Legacy paper ${index + 1} is missing a title or questions.`);
      continue;
    }

    const title = legacy.title.trim();

    // Existing title check handles old records whose IDs differ.
    const titleKey = title.toLowerCase();

    if (
      (legacy.id && existingIds.has(legacy.id)) ||
      existingTitles.has(titleKey)
    ) {
      result.skipped++;
      continue;
    }

    const row = {
      title,
      section: legacy.section || "Quantitative Aptitude",
      minutes: Math.max(1, Number(legacy.minutes) || 20),
      questions: legacy.questions,
      paper_text: legacy.paperText ?? legacy.paper_text ?? "",
      answer_key_text:
        legacy.answerKeyText ?? legacy.answer_key_text ?? "",
      is_published: false,
      created_by: user.id,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("papers")
      .insert(row)
      .select("id, title")
      .single();

    if (insertError) {
      result.errors.push(`${title}: ${insertError.message}`);
      continue;
    }

    result.migrated++;

    if (inserted) {
      existingIds.add(String(inserted.id));
      existingTitles.add(String(inserted.title || "").trim().toLowerCase());
    }
  }

  // Mark completed only when no inserts failed and every record was handled.
  // Keep localStorage source data intact until you verify Supabase.
  if (result.errors.length === 0) {
    localStorage.setItem(MIGRATION_MARKER, "completed");
  }

  return result;
}