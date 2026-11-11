/**
 * Walkthrough timeline — all durations live here so the pacing is easy
 * to tweak. Scenes are pure functions of local time `t` (ms inside the
 * scene), which makes seeking, pausing and reduced-motion stills free.
 */

export interface SceneDef {
  id: 'connect' | 'pick' | 'view' | 'arrange';
  caption: string;
  start: number;
  end: number;
}

export const SCENES: SceneDef[] = [
  { id: 'connect', caption: '1. Paste any finance API URL and test it', start: 0, end: 5000 },
  { id: 'pick', caption: '2. Pick the fields you want', start: 5000, end: 10000 },
  { id: 'view', caption: '3. Choose card, table or chart', start: 10000, end: 14000 },
  { id: 'arrange', caption: "4. Arrange it, and it's saved automatically", start: 14000, end: 20000 },
];

export const TOTAL_MS = SCENES[SCENES.length - 1].end;
export const DEMO_URL = 'https://api.coinbase.com/v2/exchange-rates?currency=BTC';

/** Finished-state local times — the still frame shown per scene in
 *  reduced-motion mode. */
export const SCENE_T_END = [4700, 4700, 3800, 5800];

export function sceneIndexAt(elapsed: number): number {
  const i = SCENES.findIndex((s) => elapsed < s.end);
  return i === -1 ? SCENES.length - 1 : i;
}

/** Local ms inside the active scene. */
export function sceneTimeAt(elapsed: number): number {
  const s = SCENES[sceneIndexAt(elapsed)];
  return Math.max(0, Math.min(elapsed - s.start, s.end - s.start));
}

/* ------------------------------------------------------------------ */
/* Cursor keyframes — each scene exports its own path. Positions are    */
/* % of the stage; `click` fires a ripple when the key is reached.      */
/* ------------------------------------------------------------------ */

export interface CursorKey {
  t: number;
  x: number;
  y: number;
  click?: boolean;
}

/**
 * The cursor position at scene-local time `t` — returns the latest key
 * at or before `t`; the motion layer glides between returned positions.
 */
export function cursorAt(keys: CursorKey[], t: number): CursorKey {
  let cur = keys[0];
  for (const k of keys) {
    if (k.t > t) break;
    cur = k;
  }
  return cur;
}

/** Index of the active cursor key — used to fire click ripples once. */
export function cursorKeyIndexAt(keys: CursorKey[], t: number): number {
  let cur = 0;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].t > t) break;
    cur = i;
  }
  return cur;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** True while `t` is inside [from, to). */
export const during = (t: number, from: number, to = Infinity) =>
  t >= from && t < to;
