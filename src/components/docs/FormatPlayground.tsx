'use client';

import { useState } from 'react';
import { formatValue } from '@/lib/formatters';
import { Label } from '@/components/ui/label';

const FORMATS: { label: string; run: (v: unknown) => string }[] = [
  { label: 'auto', run: (v) => formatValue(v, 'auto') },
  { label: 'text', run: (v) => formatValue(v, 'text') },
  { label: 'number', run: (v) => formatValue(v, 'number') },
  { label: 'currency · USD', run: (v) => formatValue(v, 'currency', { currency: 'USD' }) },
  { label: 'currency · INR', run: (v) => formatValue(v, 'currency', { currency: 'INR' }) },
  { label: 'percent', run: (v) => formatValue(v, 'percent') },
  { label: 'date', run: (v) => formatValue(v, 'date') },
];

const PRESETS = ['1234567.891', '5.32', '-0.84', '2025-01-15', '0.995'];

/**
 * Interactive formatter demo — types a raw value through the same
 * `formatValue` the widgets use, rendered in every format at once.
 */
export function FormatPlayground() {
  const [raw, setRaw] = useState('1234567.891');
  return (
    <div className="rounded-xl border border-subtle bg-raised/40 p-4">
      <Label htmlFor="format-playground" className="text-[11px] uppercase tracking-wider text-faint">
        Value
      </Label>
      <input
        id="format-playground"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Type a value…"
        spellCheck={false}
        className="mt-1.5 h-9 w-full rounded-lg border border-subtle bg-surface px-3 font-mono text-sm outline-none placeholder:text-faint focus:border-strong"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setRaw(p)}
            className="rounded-md border border-subtle bg-surface px-2 py-0.5 font-mono text-[11px] text-muted transition-colors hover:border-strong hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FORMATS.map((f) => (
          <div
            key={f.label}
            className="rounded-lg border border-subtle bg-surface px-3 py-2"
          >
            <dt className="text-[10px] uppercase tracking-wider text-faint">
              {f.label}
            </dt>
            <dd className="mt-0.5 truncate font-mono text-sm tabular-nums" title={f.run(raw)}>
              {raw === '' ? '—' : f.run(raw)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
