'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { DEMO_URL, during, type CursorKey } from './timeline';

/**
 * Scene 1 (0–5s) — Connect: click the URL input, the endpoint types in,
 * click Test → spinner → green "Connected" banner.
 */
export const CURSOR: CursorKey[] = [
  { t: 0, x: 110, y: 55 },
  { t: 400, x: 38, y: 24, target: 'url' },
  { t: 800, x: 38, y: 24, target: 'url', click: true },
  { t: 2700, x: 80, y: 24, target: 'test' },
  { t: 3000, x: 80, y: 24, target: 'test', click: true },
  { t: 4300, x: 80, y: 24, target: 'test' },
];

const TYPE_AT = 900;
const CHAR_MS = 26;
const TEST_AT = 3000;
const CONNECTED_AT = 3700;

export function SceneConnect({ t }: { t: number }) {
  const typed = Math.max(0, Math.min(DEMO_URL.length, Math.floor((t - TYPE_AT) / CHAR_MS)));
  const testing = during(t, TEST_AT, CONNECTED_AT);
  const connected = during(t, CONNECTED_AT);

  return (
    <div className="absolute inset-x-[8%] top-[10%] rounded-xl border border-subtle bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">Add widget</span>
        <span className="rounded border border-subtle bg-raised px-1 py-px text-[9px] text-faint">
          Esc
        </span>
      </div>

      <p className="mb-1 text-[11px] font-medium text-muted">API URL</p>
      <div className="flex items-center gap-1.5">
        <div
          data-cursor="url"
          className="flex h-9 flex-1 items-center overflow-hidden rounded-lg border border-subtle bg-canvas px-2.5"
        >
          <span className="whitespace-nowrap font-mono text-[11px] text-muted">
            {DEMO_URL.slice(0, typed)}
            {during(t, TYPE_AT) && typed < DEMO_URL.length && (
              <motion.span
                className="ml-px inline-block h-3 w-px bg-muted align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              />
            )}
          </span>
        </div>
        <div
          data-cursor="test"
          className="flex h-9 w-16 items-center justify-center rounded-lg border border-subtle bg-raised text-xs font-medium text-ink"
        >
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

      <AnimatePresence>
        {connected && (
          <motion.div
            className="mt-2.5 flex items-center gap-1.5 overflow-hidden rounded-lg border border-up/30 bg-up/10 px-2.5 text-[11px] font-medium text-up"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 30 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="size-3" aria-hidden />
            Connected · 12 fields found
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 space-y-1 opacity-60">
        {['data.currency', 'data.rates.INR', 'data.rates.USD'].map((p) => (
          <div
            key={p}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
          >
            <span className="size-3.5 rounded border border-strong" />
            <span className="font-mono text-muted">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
