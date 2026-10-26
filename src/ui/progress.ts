const KEY = 'gridroom.v1.progress';

export type Progress = Record<number, { stars: number }>;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveStars(progress: Progress, levelId: number, stars: number): Progress {
  const best = Math.max(stars, progress[levelId]?.stars ?? 0);
  const next = { ...progress, [levelId]: { stars: best } };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage can be blocked (private windows); the game still works without it
  }
  return next;
}

export const isUnlocked = (progress: Progress, levelId: number, teacherMode: boolean) =>
  teacherMode || levelId === 1 || (progress[levelId - 1]?.stars ?? 0) > 0;
