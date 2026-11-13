export type UserProfile = {
  id: string;
  displayName: string;
  targetExam: string;
  targetScore: number;
  dailyGoalMinutes: number;
  createdAt: number;
  updatedAt: number;
  avatarHue: number; // 0–360 for a simple color avatar
};

const PROFILE_KEY = "ibps-mock-user-profile-v1";

export function readProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.id || !p?.displayName) return null;
    return p as UserProfile;
  } catch {
    return null;
  }
}

export function writeProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function upsertProfile(
  partial: Partial<Omit<UserProfile, "id" | "createdAt">> & {
    displayName: string;
  }
): UserProfile {
  const existing = readProfile();
  const now = Date.now();
  const next: UserProfile = {
    id: existing?.id || crypto.randomUUID(),
    displayName: partial.displayName.trim() || "Aspirant",
    targetExam: partial.targetExam ?? existing?.targetExam ?? "IBPS PO",
    targetScore: partial.targetScore ?? existing?.targetScore ?? 60,
    dailyGoalMinutes:
      partial.dailyGoalMinutes ?? existing?.dailyGoalMinutes ?? 60,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    avatarHue: partial.avatarHue ?? existing?.avatarHue ?? Math.floor(Math.random() * 360),
  };
  writeProfile(next);
  return next;
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}