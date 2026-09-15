export const USABILITY_STORAGE_KEY = "provascan:usability:v1";

export type UsabilityPreferences = { easyMode: boolean; tutorialSeen: boolean };
export const DEFAULT_USABILITY_PREFERENCES: UsabilityPreferences = { easyMode: false, tutorialSeen: false };

export function parseUsabilityPreferences(raw: string | null): UsabilityPreferences {
  if (!raw) return DEFAULT_USABILITY_PREFERENCES;
  try {
    const value = JSON.parse(raw) as Partial<UsabilityPreferences>;
    if (typeof value.easyMode !== "boolean" || typeof value.tutorialSeen !== "boolean") return DEFAULT_USABILITY_PREFERENCES;
    return { easyMode: value.easyMode, tutorialSeen: value.tutorialSeen };
  } catch {
    return DEFAULT_USABILITY_PREFERENCES;
  }
}

export function serializeUsabilityPreferences(value: UsabilityPreferences) {
  return JSON.stringify(value);
}
