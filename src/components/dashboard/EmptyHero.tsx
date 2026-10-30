'use client';

import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetType } from '@/types/widget';
import { ApiUrlComposer } from './ApiUrlComposer';
import { CellMosaic } from './CellMosaic';

const TEMPLATE_CHIPS: { label: string; type: WidgetType }[] = [
  { label: 'Indian markets', type: 'table' },
  { label: 'US stocks', type: 'table' },
  { label: 'Crypto', type: 'chart' },
];

export function EmptyHero() {
  const addWidget = useDashboardStore((s) => s.addWidget);

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-1 items-center justify-center overflow-hidden">
      <CellMosaic side="left" />
      <CellMosaic side="right" />

      <div className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center px-6 pb-24 text-center">
        <h1 className="font-display text-[clamp(3.5rem,7vw,7.5rem)] leading-none tracking-[-0.02em]">
          What&rsquo;s moving today?
        </h1>

        <p className="mt-7 max-w-xl text-[22px] leading-[1.45] text-ink/85">
          FinBoard turns any finance API into live widgets, cards, tables
          and charts, arranged your way.
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
