/**
 * Client side of the Snake easter egg. The server replays every game from the
 * recorded moves (backend/app/anticheat.py), so the generator below must stay
 * bit-for-bit identical to the Python one.
 */

export type Direction = "U" | "D" | "L" | "R";

export interface MoveEvent {
  t: number;
  d: Direction;
}

export interface GameSessionToken {
  session_id: string;
  seed: number;
  issued_at_ms: number;
  signature: string;
}

export interface LeaderboardEntry {
  id: number;
  rank: number;
  username: string;
  score: number;
  total_ticks: number;
  duration_ms: number;
  replay_hash: string;
  created_at: string;
}

export interface SubmitScoreResponse extends LeaderboardEntry {
  improved: boolean;
  player_token: string | null;
}

/** 32-bit LCG identical to Python ((state * 1664525) + 1013904223) & 0xFFFFFFFF. */
export function nextRng(state: number): number {
  return (Math.imul(state >>> 0, 1664525) + 1013904223) >>> 0;
}

/** Deterministic food placement matching backend place_food(). */
export function placeFoodDeterministic(
  rngState: number,
  snake: { x: number; y: number }[],
  n = 20
): { food: { x: number; y: number }; rngState: number } {
  let st = rngState >>> 0;
  for (;;) {
    st = nextRng(st);
    const fx = (st >>> 16) % n;
    st = nextRng(st);
    const fy = (st >>> 16) % n;
    if (!snake.some((s) => s.x === fx && s.y === fy)) {
      return { food: { x: fx, y: fy }, rngState: st };
    }
  }
}

export function dirToCode(d: { x: number; y: number }): Direction {
  if (d.x === 0 && d.y === -1) return "U";
  if (d.x === 0 && d.y === 1) return "D";
  if (d.x === -1 && d.y === 0) return "L";
  return "R";
}

/* ----------------------------------------------------------- usernames */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
/** Same rule as backend/app/usernames.py: letters/digits joined by single . _ - */
export const USERNAME_PATTERN = "[A-Za-z0-9]+(?:[._\\-][A-Za-z0-9]+)*";
const USERNAME_RE = new RegExp(`^${USERNAME_PATTERN}$`);

export function isValidUsername(name: string): boolean {
  return (
    name.length >= USERNAME_MIN &&
    name.length <= USERNAME_MAX &&
    USERNAME_RE.test(name)
  );
}

/** Normalized key used for uniqueness (lowercase, separators removed). */
export function usernameKey(name: string): string {
  return name.replace(/[._-]/g, "").toLowerCase();
}

/* ------------------------------------------------- player name ownership */

const TOKENS_KEY = "mg-snake-tokens";

function readTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

/** Secret proving this browser owns ``name`` on the leaderboard. */
export function getPlayerToken(name: string): string | undefined {
  const token = readTokens()[usernameKey(name)];
  return typeof token === "string" ? token : undefined;
}

export function savePlayerToken(name: string, token: string): void {
  try {
    const tokens = readTokens();
    tokens[usernameKey(name)] = token;
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    /* storage unavailable: the name simply cannot be reused from this browser */
  }
}
