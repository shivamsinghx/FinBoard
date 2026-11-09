'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const MAX_SYMBOLS = 20;

/**
 * Chips input for watchlist symbols. Enter or comma commits; Backspace
 * on an empty field removes the last chip. Symbols are uppercased and
 * deduplicated.
 */
export function SymbolsInput({
  symbols,
  onChange,
}: {
  symbols: string[];
  onChange: (symbols: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const sym = raw.trim().toUpperCase();
    if (!sym) return;
    if (!symbols.includes(sym) && symbols.length < MAX_SYMBOLS) {
      onChange([...symbols, sym]);
    }
    setDraft('');
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-subtle bg-raised px-2 py-2 focus-within:border-accent">
      {symbols.map((s) => (
        <span
          key={s}
          className="flex items-center gap-1 rounded-full border border-subtle bg-surface px-2 py-0.5 text-xs font-medium text-ink"
        >
          {s}
          <button
            type="button"
            onClick={() => onChange(symbols.filter((x) => x !== s))}
            aria-label={`Remove ${s}`}
            className="text-faint transition-colors hover:text-down"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) {
            commit(v.slice(0, -1));
          } else {
            setDraft(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && symbols.length) {
            onChange(symbols.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={symbols.length ? '' : 'AAPL, MSFT, TSLA…'}
        aria-label="Add symbol"
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-xs text-ink outline-none placeholder:text-faint"
      />
    </div>
  );
}
