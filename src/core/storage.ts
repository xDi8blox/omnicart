import type { StatsMap, HighScoreEntry } from './types';

const KEY = 'omnicart.v1.stats';
const SETTINGS_KEY = 'omnicart.v1.settings';

export interface Settings {
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  sfxVolume: 0.7,
  musicVolume: 0.45,
  muted: false,
};

export function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StatsMap) : {};
  } catch {
    return {};
  }
}

export function getEntry(id: string): HighScoreEntry {
  const all = loadStats();
  return all[id] ?? { best: 0, plays: 0, wins: 0, lastPlayed: 0 };
}

export function recordPlay(id: string, score: number, won = false): HighScoreEntry {
  const all = loadStats();
  const cur = all[id] ?? { best: 0, plays: 0, wins: 0, lastPlayed: 0 };
  const next: HighScoreEntry = {
    best: Math.max(cur.best, score),
    plays: cur.plays + 1,
    wins: cur.wins + (won ? 1 : 0),
    lastPlayed: Date.now(),
  };
  all[id] = next;
  localStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
