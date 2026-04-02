export interface TagShortcutSettings {
  j: string | null;
  k: string | null;
  l: string | null;
}

export const DEFAULT_TAG_SHORTCUT_SETTINGS: TagShortcutSettings = {
  j: null,
  k: null,
  l: null,
};

function settingsKey(userId: string): string {
  return `tag-shortcuts:${userId}`;
}

export function readTagShortcutSettings(userId: string): TagShortcutSettings {
  if (typeof window === "undefined") return DEFAULT_TAG_SHORTCUT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(settingsKey(userId));
    if (!raw) return DEFAULT_TAG_SHORTCUT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TagShortcutSettings>;
    return {
      j: parsed.j ?? null,
      k: parsed.k ?? null,
      l: parsed.l ?? null,
    };
  } catch {
    return DEFAULT_TAG_SHORTCUT_SETTINGS;
  }
}

export function writeTagShortcutSettings(userId: string, settings: TagShortcutSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
}
