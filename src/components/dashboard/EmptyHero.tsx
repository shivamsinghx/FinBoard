'use client';

import { TEMPLATES } from '@/lib/templates';
import { useDashboardStore } from '@/store/dashboardStore';
import { ApiUrlComposer } from './ApiUrlComposer';
import { CellMosaic } from './CellMosaic';
import { MorphPill, useMorphSequence, type MorphSlot } from './MorphPill';

const PILLS: { tint: { bg: string; fg: string }; slots: MorphSlot[] }[] = [
  {
    tint: { bg: '#DBE9FE', fg: '#3B82F6' },
    slots: [
      { word: 'cards', img: '/icons/morph-cursor.png' },
      { word: 'quotes', img: '/icons/morph-quotes.png' },
      { word: 'watchlists', img: '/icons/morph-watchlist.png' },
      { word: 'widgets', img: '/icons/morph-check.png' },
    ],
  },
  {
    tint: { bg: '#EBDFF5', fg: '#8B5CF6' },
    slots: [
      { word: 'tables', img: '/icons/morph-tables-bars.png' },
      { word: 'screeners', img: '/icons/morph-screeners.png' },
      { word: 'grids', img: '/icons/morph-grid.png' },
    ],
  },
  {
    tint: { bg: '#E5F8DF', fg: '#4C9E2E' },
    slots: [
      { word: 'charts', img: '/icons/morph-chart.png' },
      { word: 'trends', img: '/icons/morph-trend.png' },
    ],
  },
];

export function EmptyHero() {
  const requestTemplate = useDashboardStore((s) => s.requestTemplate);
  const indices = useMorphSequence(PILLS.map((p) => p.slots.length));

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-1 items-start justify-center overflow-hidden">
      <CellMosaic side="left" />
      <CellMosaic side="right" />

      <div className="relative z-10 mx-auto flex max-w-[940px] flex-col items-center px-6 pt-[10vh] pb-24 text-center">
        <h1 className="font-display text-[clamp(3.5rem,7vw,7.5rem)] leading-none tracking-[-0.02em]">
          What&rsquo;s moving 
        </h1>
        <h1 className="font-display text-[clamp(3.5rem,7vw,7.5rem)] leading-none tracking-[-0.02em]">
          today?
        </h1>

        <p className="mt-7 text-[clamp(1.15rem,1.9vw,1.5rem)] font-medium leading-[1.6] text-ink/90">
          <span className="sm:block sm:whitespace-nowrap">
            FinBoard turns any finance API into live{' '}
            <MorphPill {...PILLS[0]} index={indices[0]} />,{' '}
          </span>
          <span className="sm:block sm:whitespace-nowrap">
            <MorphPill {...PILLS[1]} index={indices[1]} />
            <span className="mx-1">and</span>
            <MorphPill {...PILLS[2]} index={indices[2]} />
            <span>, arranged your way.</span>
          </span>
        </p>

        <div className="mt-10">
          <ApiUrlComposer />
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-muted">
          <span>or start with</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => requestTemplate(t.id)}
              className="rounded-full border border-subtle bg-surface px-3 py-1 text-ink/80 transition-colors hover:border-strong hover:text-ink"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
