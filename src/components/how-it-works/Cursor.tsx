'use client';

import { motion } from 'motion/react';
import type { CursorKey } from './timeline';

/** Animated pointer — glides between cursor-key positions. */
export function Cursor({ pos }: { pos: CursorKey }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      initial={false}
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ type: 'tween', duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <svg width="16" height="18" viewBox="0 0 16 18" className="drop-shadow-sm">
        <path
          d="M1 1 L1 13 L4.5 10.5 L6.5 15 L8.5 14 L6.5 9.5 L10.5 9.5 Z"
          fill="#1c1917"
          stroke="#ffffff"
          strokeWidth="1.2"
        />
      </svg>
    </motion.div>
  );
}

/** Expanding ring spawned at a click point. */
export function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute z-20 size-8 rounded-full border-2 border-accent"
      style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%' }}
      initial={{ scale: 0.3, opacity: 0.9 }}
      animate={{ scale: 1.6, opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  );
}
