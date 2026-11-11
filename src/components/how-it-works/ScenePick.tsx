'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check, Plus, Search } from 'lucide-react';
import { during, type CursorKey } from './timeline';

/**
 * Scene 2 (5–10s) — Pick: search filters the field list to "INR", the
 * cursor adds data.rates.INR, and it lands in Selected with a friendly
 * label + Currency format.
 */
export const CURSOR: CursorKey[] = [
  { t: 0, x: 42, y: 8, target: 'search' },
  { t: 600, x: 42, y: 8, target: 'search', click: true },
  { t: 2100, x: 52, y: 36, target: 'add-inr' },
  { t: 2500, x: 52, y: 36, target: 'add-inr', click: true },
  { t: 3400, x: 74, y: 52, target: 'selected' },
  { t: 4200, x: 80, y: 66, target: 'format' },
  { t: 4600, x: 80, y: 66, target: 'format', click: true },
];

const SEARCH = 'INR';
const TYPE_AT = 700;
const CHAR_MS = 250;
const PICKED_AT = 2700;
const LABEL_AT = 3500;
const FORMAT_AT = 4500;

const ROWS = [
  'data.currency',
  'data.rates.INR',
  'data.rates.EUR',
  'data.rates.JPY',
  'data.rates.USD',
];

export function ScenePick({ t }: { t: number }) {
  const typed = Math.max(
    0,
    Math.min(SEARCH.length, Math.floor((t - TYPE_AT) / CHAR_MS)),
  );
  const query = SEARCH.slice(0, typed);
  const filtering = typed > 0;
  const picked = during(t, PICKED_AT);

  return (
    <div className="absolute inset-x-[8%] top-[6%]">
      {/* search */}
      <div
        data-cursor="search"
        className="mb-2 flex h-8 items-center gap-2 rounded-lg border border-subtle bg-canvas px-2.5"
      >
        <Search className="size-3.5 text-faint" aria-hidden />
        <span className="font-mono text-[11px] text-muted">
          {query}
          {during(t, TYPE_AT) && typed < SEARCH.length && (
            <motion.span
              className="ml-px inline-block h-3 w-px bg-muted align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            />
          )}
        </span>
      </div>

      <div className="flex gap-3">
        {/* field list */}
        <motion.div
          className="w-[55%] space-y-1 rounded-xl border border-subtle bg-surface p-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {ROWS.map((r) => {
            const hit = r.endsWith(query) || query === '';
            const dim = filtering && !hit;
            const isInr = r === 'data.rates.INR';
            return (
              <motion.div
                key={r}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
                animate={{ opacity: dim ? 0.25 : 1 }}
                transition={{ duration: 0.25 }}
              >
                <span className="font-mono text-muted">{r}</span>
                {isInr && (
                  <span
                    data-cursor="add-inr"
                    className={`ml-auto flex size-4 items-center justify-center rounded-full ${
                      picked
                        ? 'bg-accent text-white'
                        : 'border border-strong text-faint'
                    }`}
                  >
                    {picked ? (
                      <Check className="size-2.5" aria-hidden />
                    ) : (
                      <Plus className="size-2.5" aria-hidden />
                    )}
                  </span>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* selected panel */}
        <div className="flex-1 rounded-xl border border-subtle bg-surface p-2.5">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-faint">
            Selected fields
          </p>
          <AnimatePresence>
            {picked && (
              <motion.div
                data-cursor="selected"
                className="rounded-lg border border-subtle bg-raised/60 px-2 py-1.5"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              >
                <div className="relative h-4 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={during(t, LABEL_AT) ? 'label' : 'path'}
                      className="absolute inset-0 truncate text-[11px] font-medium"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      {during(t, LABEL_AT) ? 'BTC price' : 'data.rates.INR'}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
                  <span className="font-mono">data.rates.INR</span>
                  <span
                    data-cursor="format"
                    className="relative overflow-hidden rounded border border-subtle bg-surface px-1.5 py-px"
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={during(t, FORMAT_AT) ? 'cur' : 'auto'}
                        className="block"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                      >
                        {during(t, FORMAT_AT) ? 'Currency' : 'Auto'}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
