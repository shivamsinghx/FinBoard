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

  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const fired = useRef(-1);

  useEffect(() => {
    if (!animated || ended) return;
    const key = keys[keyIdx];
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
  }, [animated, ended, idx, keyIdx, keys]);

  const live = animated && !ended;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-subtle bg-canvas">
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
      {live && <Cursor pos={cursorAt(keys, t)} />}
    </div>
  );
}
