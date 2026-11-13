import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QuestionBankRecord, StoredAttempt } from "@/types/mock";

interface MockLabDB extends DBSchema {
  questions: {
    key: string;
    value: QuestionBankRecord;
    indexes: { "by-section": string; "by-exam": string; "by-verified": number };
  };
  attempts: {
    key: string;
    value: StoredAttempt;
    indexes: { "by-status": string; "by-updated": number };
  };
}

let dbPromise: Promise<IDBPDatabase<MockLabDB>> | undefined;

function getDb() {
  if (typeof window === "undefined") {
    throw new Error("The local question bank is available in the browser only.");
  }
  if (!dbPromise) {
    dbPromise = openDB<MockLabDB>("ibps-mock-lab", 1, {
      upgrade(db) {
        const questions = db.createObjectStore("questions", { keyPath: "id" });
        questions.createIndex("by-section", "sectionId");
        questions.createIndex("by-exam", "exam");
        questions.createIndex("by-verified", "verified");
        const attempts = db.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("by-status", "status");
        attempts.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function saveQuestions(records: QuestionBankRecord[]) {
  const db = await getDb();
  const tx = db.transaction("questions", "readwrite");
  for (const record of records) await tx.store.put(record);
  await tx.done;
}

export async function getAllQuestions() {
  const db = await getDb();
  return db.getAll("questions");
}

export async function saveAttempt(attempt: StoredAttempt) {
  const db = await getDb();
  await db.put("attempts", attempt);
}

export async function getAttempt(id: string) {
  const db = await getDb();
  return db.get("attempts", id);
}

export async function getLatestInProgressAttempt() {
  const db = await getDb();
  const attempts = await db.getAllFromIndex("attempts", "by-status", "in-progress");
  return attempts.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export async function getAllAttempts() {
  const db = await getDb();
  return (await db.getAll("attempts")).sort((a, b) => b.updatedAt - a.updatedAt);
}
