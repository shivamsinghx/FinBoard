'use client';

import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { DOC_SECTIONS } from '@/lib/docsSections';
import { scrollToId } from '@/components/docs/useScrollSpy';
import { Kbd } from '@/components/ui/kbd';

function matches(q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return DOC_SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(needle) ||
      s.keywords.some((k) => k.includes(needle)),
  );
}

/**
 * "Filter docs" box in the page header — typing narrows a suggestion
 * list of sections; Enter or a click jumps to that section.
 */
export function DocsSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => matches(query), [query]);
  const open = focused && query.trim().length > 0;

  const jump = (id: string) => {
    scrollToId(id);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) jump(results[0].id);
          if (e.key === 'Escape') {
            setQuery('');
            inputRef.current?.blur();
          }
        }}
        placeholder="Filter docs…"
        aria-label="Filter docs sections"
        className="h-9 w-full rounded-lg border border-subtle bg-surface pl-8 pr-8 text-sm outline-none placeholder:text-faint focus:border-strong"
      />
      <Kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        /
      </Kbd>

      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-subtle bg-surface shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-faint">
              No section matches “{query.trim()}”.
            </li>
          ) : (
            results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  /* keep focus stealing from closing the list first */
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => jump(s.id)}
                  className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-raised"
                >
                  {s.title}
                  <span className="ml-2 font-mono text-[10px] text-faint">
                    #{s.id}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
