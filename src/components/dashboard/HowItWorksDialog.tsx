'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  GripVertical,
  LayoutDashboard,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/* Timeline — each beat: where the cursor sits, whether it clicks, and  */
/* how long the scene holds before advancing.                           */
/* ------------------------------------------------------------------ */

interface Beat {
  caption: string;
  /** Cursor target as % of the stage. */
  x: number;
  y: number;
  click?: boolean;
  ms: number;
}

const BEATS: Beat[] = [
  { caption: 'Paste any finance API URL…', x: 34, y: 27, ms: 1500 },
  { caption: '…and hit Test to inspect the response', x: 80, y: 27, click: true, ms: 900 },
  { caption: 'FinBoard finds the fields inside', x: 80, y: 27, ms: 1400 },
  { caption: 'Pick the fields you care about', x: 42, y: 50, ms: 900 },
  { caption: 'Pick the fields you care about', x: 42, y: 50, click: true, ms: 800 },
  { caption: 'Pick the fields you care about', x: 42, y: 63, ms: 600 },
  { caption: 'Pick the fields you care about', x: 42, y: 63, click: true, ms: 900 },
  { caption: 'Choose how it displays — card, table or chart', x: 58, y: 82, ms: 900 },
  { caption: 'Choose how it displays — card, table or chart', x: 58, y: 82, click: true, ms: 800 },
  { caption: 'Choose how it displays — card, table or chart', x: 87, y: 92, click: true, ms: 900 },
  { caption: '…and it lands on your dashboard, live', x: 76, y: 78, ms: 2800 },
];

const DASHBOARD_BEAT = 10;
const CLICK_BEATS = new Set([1, 4, 6, 8, 9]);

const FIELDS: {
  path: string;
  type: string;
  sample: string;
  pickedAt: number;
}[] = [
  { path: 'c', type: 'number', sample: '178.50', pickedAt: 4 },
  { path: 'd', type: 'number', sample: '6.45', pickedAt: 6 },
  { path: 'dp', type: 'number', sample: '1.85%', pickedAt: 99 },
  { path: 'h', type: 'number', sample: '356.02', pickedAt: 99 },
];

const MODES = ['Card', 'Table', 'Chart'];

/* ------------------------------------------------------------------ */
/* Animated cursor + click ripple                                       */
/* ------------------------------------------------------------------ */

function Cursor({ beat }: { beat: Beat }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      initial={false}
      animate={{ left: `${beat.x}%`, top: `${beat.y}%` }}
      transition={{ type: 'tween', duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
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

function Ripple({ x, y }: { x: number; y: number }) {
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

/* ------------------------------------------------------------------ */
/* Scene A — simplified copy of the real Add-widget modal               */
/* ------------------------------------------------------------------ */

function ModalScene({ beat }: { beat: number }) {
  const testing = beat === 1;
  const connected = beat >= 2;
  const activeMode = beat >= 8 ? 'Table' : 'Card';

  return (
    <motion.div
      key="modal"
      className="absolute inset-x-[6%] top-[6%] rounded-xl border border-subtle bg-surface p-4 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">Add widget</span>
        <span className="text-[10px] text-faint">Esc</span>
      </div>

      {/* URL row */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-9 flex-1 items-center overflow-hidden rounded-lg border border-subtle bg-canvas px-2.5">
          <motion.div
            className="overflow-hidden whitespace-nowrap font-mono text-[11px] text-muted"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, ease: 'linear' }}
          >
            https://finnhub.io/api/v1/quote?symbol=AAPL
          </motion.div>
        </div>
        <div className="flex h-9 w-16 items-center justify-center rounded-lg border border-subtle bg-raised text-xs font-medium text-ink">
          {testing ? (
            <motion.span
              className="size-3.5 rounded-full border-2 border-accent border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
          ) : (
            'Test'
          )}
        </div>
      </div>

      {/* Connected banner */}
      <AnimatePresence>
        {connected && (
          <motion.div
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-up/30 bg-up/10 px-2.5 py-1.5 text-[11px] font-medium text-up"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="size-3" aria-hidden />
            Connected · 4 fields found
          </motion.div>
        )}
      </AnimatePresence>

      {/* Field rows */}
      <div className="mt-3 space-y-1">
        {FIELDS.map((f) => {
          const picked = beat >= f.pickedAt;
          return (
            <div
              key={f.path}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors ${
                picked ? 'bg-accent-soft/60' : ''
              }`}
            >
              <span
                className={`flex size-3.5 items-center justify-center rounded border ${
                  picked ? 'border-accent bg-accent' : 'border-strong'
                }`}
              >
                {picked && <Check className="size-2.5 text-white" aria-hidden />}
              </span>
              <span className="font-mono text-muted">{f.path}</span>
              <span className="rounded border border-subtle bg-raised px-1 py-px text-[9px] text-faint">
                {f.type}
              </span>
              <span className="ml-auto text-faint">{f.sample}</span>
            </div>
          );
        })}
      </div>

      {/* Mode toggle + save */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex rounded-md bg-raised p-0.5">
          {MODES.map((m) => (
            <span
              key={m}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeMode === m
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-faint'
              }`}
            >
              {m}
            </span>
          ))}
        </div>
        <span
          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-accent-contrast transition-colors ${
            beat >= 8 ? 'bg-accent' : 'bg-accent/70'
          }`}
        >
          Save widget
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Scene B — mini dashboard with the new widget landing                 */
/* ------------------------------------------------------------------ */

function DashboardScene() {
  return (
    <motion.div
      key="dash"
      className="absolute inset-x-[6%] top-[8%]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-faint">
        <LayoutDashboard className="size-3" aria-hidden />
        My dashboard
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {['Watchlist', 'Top gainers'].map((t) => (
          <div
            key={t}
            className="rounded-xl border border-subtle bg-surface p-2.5"
          >
            <div className="mb-2 flex items-center gap-1 text-[10px] font-medium text-muted">
              <GripVertical className="size-2.5 text-faint/70" aria-hidden />
              {t}
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 w-4/5 rounded bg-raised" />
              <div className="h-1.5 w-3/5 rounded bg-raised" />
              <div className="h-1.5 w-2/3 rounded bg-raised" />
            </div>
          </div>
        ))}
        {/* the new widget — pops in with a ring pulse */}
        <motion.div
          className="relative rounded-xl border border-accent/50 bg-surface p-2.5"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 22 }}
        >
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl border-2 border-accent"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.12 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          />
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium">
            <GripVertical className="size-2.5 text-faint/70" aria-hidden />
            AAPL
            <span className="ml-auto rounded border border-up/40 px-1 text-[8px] font-medium text-up">
              Live
            </span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted">Price</span>
              <span className="font-medium">$354.96</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Change</span>
              <span className="font-medium text-up">▲ 1.85%</span>
            </div>
          </div>
        </motion.div>
      </div>
      <motion.div
        className="mt-2.5 flex items-center justify-center gap-1 rounded-xl border-2 border-dashed border-subtle py-3 text-[10px] text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Plus className="size-3" aria-hidden />
        Add widget
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                               */
/* ------------------------------------------------------------------ */

export function HowItWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [beat, setBeat] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);

  // Advance the timeline; restart from the top whenever it opens.
  useEffect(() => {
    if (!open) return;
    const start = setTimeout(() => setBeat(0), 0);
    return () => clearTimeout(start);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => setBeat((b) => (b + 1) % BEATS.length),
      BEATS[beat].ms,
    );
    return () => clearTimeout(t);
  }, [beat, open]);

  // Spawn a ripple whenever we land on a click beat.
  useEffect(() => {
    if (!open || !CLICK_BEATS.has(beat)) return;
    const b = BEATS[beat];
    const id = ++rippleId.current;
    const spawn = setTimeout(
      () => setRipples((r) => [...r.slice(-3), { id, x: b.x, y: b.y }]),
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
  }, [beat, open]);

  const current = BEATS[beat];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[760px]">
        <div className="px-5 pt-5">
          <DialogTitle className="text-base">How it works</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Any finance API → live widgets, in about a minute.
          </DialogDescription>
        </div>

        {/* Stage */}
        <div className="px-5 pt-4">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-subtle bg-canvas">
            <AnimatePresence mode="wait">
              {beat < DASHBOARD_BEAT ? (
                <ModalScene key="modal" beat={beat} />
              ) : (
                <DashboardScene key="dash" />
              )}
            </AnimatePresence>
            {ripples.map((r) => (
              <Ripple key={r.id} x={r.x} y={r.y} />
            ))}
            <Cursor beat={current} />
          </div>
        </div>

        {/* Caption + controls */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={current.caption}
                className="truncate text-sm text-muted"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {current.caption}
              </motion.p>
            </AnimatePresence>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-raised">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${((beat + 1) / BEATS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setBeat(0)}
            aria-label="Replay walkthrough"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Replay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
