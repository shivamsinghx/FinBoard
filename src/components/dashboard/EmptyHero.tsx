'use client';

import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetType } from '@/types/widget';
import { ApiUrlComposer } from './ApiUrlComposer';
import { CellMosaic } from './CellMosaic';
import { MorphPill, useMorphSequence, type MorphSlot } from './MorphPill';

const TEMPLATE_CHIPS: { label: string; type: WidgetType }[] = [
  { label: 'Indian markets', type: 'table' },
  { label: 'US stocks', type: 'table' },
  { label: 'Crypto', type: 'chart' },
];

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
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [indices, advance] = useMorphSequence(PILLS.map((p) => p.slots.length));

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-1 items-start justify-center overflow-hidden">
      <CellMosaic side="left" />
      <CellMosaic side="right" />

      <div className="relative z-10 mx-auto flex max-w-[940px] flex-col items-center px-6 pt-[10vh] pb-24 text-center">
        <h1 className="font-display text-[clamp(3.5rem,7vw,7.5rem)] leading-none tracking-[-0.02em]">
          What&rsquo;s moving today?
        </h1>

        <p className="mt-7 text-[clamp(1.15rem,1.9vw,1.5rem)] font-medium leading-[1.6] text-ink/90">
          <span className="sm:block sm:whitespace-nowrap">
            FinBoard turns any finance API into live{' '}
            <MorphPill {...PILLS[0]} index={indices[0]} onNext={() => advance(0)} />,
          </span>{' '}
          <span className="sm:block sm:whitespace-nowrap">
            <MorphPill {...PILLS[1]} index={indices[1]} onNext={() => advance(1)} />
            {' '}and{' '}
            <MorphPill {...PILLS[2]} index={indices[2]} onNext={() => advance(2)} />
            , arranged your way.
          </span>
        </p>

        <div className="mt-10">
          <ApiUrlComposer />
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-muted">
          <span>or start with</span>
          {TEMPLATE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() =>
                addWidget(chip.type, { config: { title: chip.label } })
              }
              className="rounded-full border border-subtle bg-surface px-3 py-1 text-ink/80 transition-colors hover:border-strong hover:text-ink"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
