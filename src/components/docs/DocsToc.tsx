'use client';

import { DOC_SECTIONS } from '@/lib/docsSections';
import { scrollToId, useScrollSpy } from '@/components/docs/useScrollSpy';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const IDS = DOC_SECTIONS.map((s) => s.id);

/**
 * Left-hand table of contents. Sticky scroll-spied list on lg+,
 * a Select dropdown at the top of the page below that.
 */
export function DocsToc() {
  const active = useScrollSpy(IDS);
  return (
    <>
      {/* mobile dropdown */}
      <div className="mb-6 lg:hidden">
        <Select
          value={active}
          onValueChange={(v) => v && scrollToId(v)}
        >
          <SelectTrigger className="w-full bg-surface">
            <SelectValue placeholder="Jump to a section" />
          </SelectTrigger>
          <SelectContent>
            {DOC_SECTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* desktop sticky list */}
      <nav
        aria-label="On this page"
        className="sticky top-24 hidden self-start lg:block"
      >
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-faint">
          On this page
        </p>
        <ul className="space-y-1 border-l border-subtle">
          {DOC_SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => scrollToId(s.id)}
                className={`-ml-px block border-l-2 py-1 pl-3 text-left text-[13px] transition-colors ${
                  active === s.id
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-muted hover:border-strong hover:text-ink'
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
