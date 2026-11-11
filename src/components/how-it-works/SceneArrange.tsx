'use client';

import { motion } from 'motion/react';
import { Check, GripVertical, LayoutDashboard } from 'lucide-react';
import { clamp01, during, type CursorKey } from './timeline';

/**
 * Scene 4 (14–20s) — Arrange: the new widget drops into the grid, the
 * cursor drags it to a new slot, and its value ticks up green.
 */
export const CURSOR: CursorKey[] = [
  { t: 0, x: 110, y: 60 },
  { t: 900, x: 21, y: 38 },
  { t: 1400, x: 21, y: 38, click: true },
  { t: 1900, x: 45, y: 42 },
  { t: 2300, x: 68, y: 42 },
  { t: 2600, x: 79, y: 42 },
  { t: 2700, x: 79, y: 42, click: true },
  { t: 3300, x: 79, y: 42 },
];

const DRAG_AT = 1600;
const DRAG_MS = 1100;
const TICK_AT = 3400;

function GhostCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-subtle bg-surface p-2.5">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-medium text-muted">
        <GripVertical className="size-2.5 text-faint/70" aria-hidden />
        {title}
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 w-4/5 rounded bg-raised" />
        <div className="h-1.5 w-3/5 rounded bg-raised" />
        <div className="h-1.5 w-2/3 rounded bg-raised" />
      </div>
    </div>
  );
}

export function SceneArrange({ t }: { t: number }) {
  const dragP = clamp01((t - DRAG_AT) / DRAG_MS);
  const dragging = during(t, DRAG_AT, DRAG_AT + DRAG_MS);
  const ticked = during(t, TICK_AT);

  // Slots: new card slides 8% → 66%; ghosts shuffle one slot left.
  const newLeft = 8 + dragP * 58;
  const ghostShift = clamp01((dragP - 0.5) / 0.4);

  return (
    <div className="absolute inset-x-[6%] top-[12%]">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-faint">
        <LayoutDashboard className="size-3" aria-hidden />
        My dashboard
        <span className="ml-auto flex items-center gap-1 text-[9px]">
          <Check className="size-2.5 text-up" aria-hidden />
          Saved
        </span>
      </div>

      <div className="relative h-32">
        {/* ghost cards — shift left as the new card passes */}
        <motion.div
          className="absolute w-[26%]"
          animate={{ left: `${37 - ghostShift * 29}%` }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <GhostCard title="Watchlist" />
        </motion.div>
        <motion.div
          className="absolute w-[26%]"
          animate={{ left: `${66 - ghostShift * 29}%` }}
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <GhostCard title="Top gainers" />
        </motion.div>

        {/* the new widget — drops in, then rides the drag */}
        <motion.div
          className="absolute w-[26%]"
          initial={{ y: '-70%', opacity: 0 }}
          animate={{
            left: `${newLeft}%`,
            y: 0,
            opacity: 1,
            scale: dragging ? 1.04 : 1,
          }}
          transition={{
            left: { type: 'tween', duration: 0.15, ease: 'linear' },
            y: { type: 'spring', stiffness: 260, damping: 22, delay: 0.35 },
            opacity: { duration: 0.25, delay: 0.3 },
            scale: { duration: 0.2 },
          }}
        >
          <div
            className={`rounded-xl border bg-surface p-2.5 transition-colors ${
              dragging ? 'border-accent/70 shadow-lg' : 'border-subtle'
            }`}
          >
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium">
              <GripVertical className="size-2.5 text-faint/70" aria-hidden />
              BTC price
              <span className="ml-auto rounded border border-up/40 px-1 text-[8px] font-medium text-up">
                Live
              </span>
            </div>
            <motion.div
              className="rounded px-1 py-0.5"
              animate={
                during(t, TICK_AT, TICK_AT + 900)
                  ? { backgroundColor: ['rgba(5,150,105,0)', 'rgba(5,150,105,0.14)', 'rgba(5,150,105,0)'] }
                  : { backgroundColor: 'rgba(5,150,105,0)' }
              }
              transition={{ duration: 0.9 }}
            >
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-muted">Price</span>
                <span className={`font-medium ${ticked ? 'text-up' : 'text-ink'}`}>
                  {ticked ? '₹95,890' : '₹95,412'}
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between text-[10px]">
                <span className="text-muted">Change %</span>
                <span className="font-medium text-up">▲ 2.31%</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1 rounded-xl border-2 border-dashed border-subtle py-2 text-[10px] text-muted">
        + Add widget
      </div>
    </div>
  );
}
