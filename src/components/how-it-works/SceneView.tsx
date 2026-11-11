'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { CursorKey } from './timeline';

/**
 * Scene 3 (10–14s) — View: the cursor cycles Card → Table → Chart and a
 * little preview morphs to match.
 */
export const CURSOR: CursorKey[] = [
  { t: 0, x: 36, y: 13 },
  { t: 700, x: 36, y: 13, click: true },
  { t: 1800, x: 50, y: 13 },
  { t: 2100, x: 50, y: 13, click: true },
  { t: 3000, x: 64, y: 13 },
  { t: 3300, x: 64, y: 13, click: true },
];

const MODES = ['Card', 'Table', 'Chart'] as const;
type Mode = (typeof MODES)[number];

function activeMode(t: number): Mode {
  if (t >= 3300) return 'Chart';
  if (t >= 2100) return 'Table';
  return 'Card';
}

function CardPreview() {
  return (
    <div className="space-y-1.5">
      {[
        ['Price', '$95,412', 'text-ink'],
        ['Change %', '▲ 2.31%', 'text-up'],
      ].map(([l, v, c]) => (
        <div key={l} className="flex items-baseline justify-between text-[11px]">
          <span className="text-muted">{l}</span>
          <span className={`font-medium ${c}`}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function TablePreview() {
  const rows = [
    ['BTC', '$95,412', 'text-ink'],
    ['ETH', '$3,204', 'text-ink'],
    ['SOL', '$141.8', 'text-up'],
  ];
  return (
    <div>
      <div className="flex justify-between border-b border-subtle pb-1 text-[9px] font-medium uppercase tracking-wide text-faint">
        <span>Asset</span>
        <span>Price</span>
      </div>
      {rows.map(([a, p, c]) => (
        <div
          key={a}
          className="flex justify-between border-b border-subtle/50 py-1 text-[10px] last:border-0"
        >
          <span className="font-medium">{a}</span>
          <span className={c}>{p}</span>
        </div>
      ))}
    </div>
  );
}

function ChartPreview() {
  return (
    <svg viewBox="0 0 160 60" className="h-14 w-full">
      <motion.path
        d="M4 50 L22 44 L40 46 L58 34 L76 38 L94 26 L112 30 L130 16 L148 20 L156 10"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      <circle cx="156" cy="10" r="3" fill="var(--accent)" />
    </svg>
  );
}

export function SceneView({ t }: { t: number }) {
  const active = activeMode(t);
  return (
    <div className="absolute inset-x-[10%] top-[8%]">
      <div className="mx-auto flex w-fit rounded-md bg-raised p-0.5">
        {MODES.map((m) => (
          <span
            key={m}
            className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
              active === m ? 'bg-surface text-ink shadow-xs' : 'text-faint'
            }`}
          >
            {m}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-3 w-[70%] rounded-xl border border-subtle bg-surface p-3 shadow-sm">
        <div className="mb-2 text-[10px] font-medium text-muted">BTC / INR</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {active === 'Card' && <CardPreview />}
            {active === 'Table' && <TablePreview />}
            {active === 'Chart' && <ChartPreview />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
