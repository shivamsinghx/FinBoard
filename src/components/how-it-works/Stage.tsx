'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SceneConnect, CURSOR as CONNECT_KEYS } from './SceneConnect';
import { ScenePick, CURSOR as PICK_KEYS } from './ScenePick';
import { SceneView, CURSOR as VIEW_KEYS } from './SceneView';
import { SceneArrange, CURSOR as ARRANGE_KEYS } from './SceneArrange';
import { Cursor, Ripple } from './Cursor';
import {
  cursorAt,
  cursorKeyIndexAt,
  SCENE_T_END,
  sceneIndexAt,
  sceneTimeAt,
  type CursorKey,
} from './timeline';

const SCENES_COMPONENTS: ((props: { t: number }) => ReactNode)[] = [
  SceneConnect,
  ScenePick,
  SceneView,
  SceneArrange,
];
const SCENE_CURSORS: CursorKey[][] = [
  CONNECT_KEYS,
  PICK_KEYS,
  VIEW_KEYS,
  ARRANGE_KEYS,
];

/** Measured `data-cursor` element center, else the key's % fallback. */
function resolveKey(
  key: CursorKey,
  targets: Record<string, { x: number; y: number }>,
): CursorKey {
  const hit = key.target ? targets[key.target] : undefined;
  return hit ? { ...key, x: hit.x, y: hit.y } : key;
}

/**
 * The 16:10 walkthrough stage — renders the active scene as a pure
 * function of elapsed time, plus cursor + click ripples. `animated=false`
 * renders the finished frame only (reduced-motion mode); `ended` swaps
 * the whole stage for the end screen.
 */
export function Stage({
  elapsed,
  animated,
  ended,
  endScreen,
}: {
  elapsed: number;
  animated: boolean;
  ended: boolean;
  endScreen: ReactNode;
}) {
  const idx = sceneIndexAt(elapsed);
  const t = sceneTimeAt(elapsed);
  const keys = SCENE_CURSORS[idx];
  const keyIdx = cursorKeyIndexAt(keys, t);
  const Scene = SCENES_COMPONENTS[idx];

  const stageRef = useRef<HTMLDivElement>(null);
  /**
   * `data-cursor` element centers in % of the stage — re-measured on
   * every render (the clock ticks ~20fps), so targets animate, resize
   * and appear mid-scene without the cursor ever guessing. Stored in
   * state with an epsilon guard so it converges without a loop.
   */
  const [targets, setTargets] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const next: Record<string, { x: number; y: number }> = {};
    root.querySelectorAll<HTMLElement>('[data-cursor]').forEach((el) => {
      const r = el.getBoundingClientRect();
      next[el.dataset.cursor ?? ''] = {
        x: ((r.left + r.width / 2 - box.left) / box.width) * 100,
        y: ((r.top + r.height / 2 - box.top) / box.height) * 100,
      };
    });
    setTargets((prev) => {
      const pk = Object.keys(prev);
      const nk = Object.keys(next);
      if (
        pk.length === nk.length &&
        nk.every(
          (k) =>
            prev[k] &&
            Math.abs(prev[k].x - next[k].x) < 0.05 &&
            Math.abs(prev[k].y - next[k].y) < 0.05,
        )
      ) {
        return prev;
      }
      return next;
    });
  }, [t]);

  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const fired = useRef(-1);

  useEffect(() => {
    if (!animated || ended) return;
    const key = resolveKey(keys[keyIdx], targets);
    if (!key?.click || fired.current === idx * 100 + keyIdx) return;
    fired.current = idx * 100 + keyIdx;
    const id = Date.now() + keyIdx;
    const spawn = setTimeout(
      () => setRipples((r) => [...r.slice(-3), { id, x: key.x, y: key.y }]),
      0,
    );
    const clear = setTimeout(
      () => setRipples((r) => r.filter((p) => p.id !== id)),
      650,
    );
    return () => {
      clearTimeout(spawn);
      clearTimeout(clear);
    };
  }, [animated, ended, idx, keyIdx, keys, targets]);

  const live = animated && !ended;

  return (
    <div
      ref={stageRef}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-subtle bg-canvas"
    >
      {ended ? (
        endScreen
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Scene t={animated ? t : SCENE_T_END[idx]} />
          </motion.div>
        </AnimatePresence>
      )}
      {live && ripples.map((r) => <Ripple key={r.id} x={r.x} y={r.y} />)}
      {live && <Cursor pos={resolveKey(cursorAt(keys, t), targets)} />}
    </div>
  );
}
