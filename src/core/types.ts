export type GameCategory = 'arcade' | 'puzzle' | 'racing' | 'action';

export type TouchLayout =
  | 'dpad-ab'
  | 'dpad-only'
  | 'tap'
  | 'flippers'
  | 'aim'
  | 'lanes'
  | 'fighter'
  | 'none';

export interface GameMeta {
  id: string;
  name: string;
  subtitle: string;
  category: GameCategory;
  accent: string;
  controls: string;
  description: string;
  howto: string;
  touch: TouchLayout;
}

export interface GameHooks {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number, won?: boolean) => void;
  onPauseChange?: (paused: boolean) => void;
}

export interface GameInstance {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  getScore(): number;
}

export type GameFactory = (
  canvas: HTMLCanvasElement,
  hooks: GameHooks,
) => GameInstance | Promise<GameInstance>;

export interface HighScoreEntry {
  best: number;
  plays: number;
  wins: number;
  lastPlayed: number;
}

export type StatsMap = Record<string, HighScoreEntry>;
