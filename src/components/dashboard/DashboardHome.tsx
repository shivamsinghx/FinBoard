'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { computeGridSpans } from '@/lib/gridLayout';
import { useDashboardHydration, useDashboardStore } from '@/store/dashboardStore';
import type { WidgetInstance } from '@/types/widget';
import { CardWidget } from '@/components/widgets/CardWidget';
import { TableWidget } from '@/components/widgets/TableWidget';
import { DashboardToolbar } from './DashboardToolbar';
import { EmptyHero } from './EmptyHero';
import { Header } from './Header';
import { WidgetCard } from './WidgetCard';

/** The modal is heavy (explorer + pickers) — load it only when opened. */
const AddWidgetModal = dynamic(
  () => import('./AddWidgetModal').then((m) => m.AddWidgetModal),
  { ssr: false },
);

/**
 * Literal lookup tables — Tailwind only emits classes it finds in
 * source, so dynamic `col-span-${n}` strings can't be used.
 */
const COL_SM: Record<number, string> = {
  1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3',
  4: 'sm:col-span-4', 5: 'sm:col-span-5', 6: 'sm:col-span-6',
};
const COL_LG: Record<number, string> = {
  1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3',
  4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
  7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9',
  10: 'lg:col-span-10', 11: 'lg:col-span-11', 12: 'lg:col-span-12',
};
const ROW_SM: Record<number, string> = {
  1: 'sm:row-span-1', 2: 'sm:row-span-2', 3: 'sm:row-span-3',
  4: 'sm:row-span-4', 5: 'sm:row-span-5', 6: 'sm:row-span-6',
  7: 'sm:row-span-7', 8: 'sm:row-span-8', 9: 'sm:row-span-9',
  10: 'sm:row-span-10', 11: 'sm:row-span-11', 12: 'sm:row-span-12',
};

/** Card and table have real renderers; chart keeps the placeholder. */
function Widget({ widget }: { widget: WidgetInstance }) {
  if (widget.type === 'card') return <CardWidget widget={widget} />;
  if (widget.type === 'table') return <TableWidget widget={widget} />;
  return <WidgetCard widget={widget} />;
}

/** Height = rows × 60px + inter-row gaps — set per item via --rows. */
const CELL_HEIGHT = 'sm:h-[calc(var(--rows)*76px-16px)]';

function WidgetList() {
  const widgets = useDashboardStore((s) => s.widgets);
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const spans6 = computeGridSpans(widgets, 6);
  const spans12 = computeGridSpans(widgets, 12);

  return (
    // Same max width + horizontal padding as the header — edges align.
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-10">
      <DashboardToolbar />
      <div className="grid auto-rows-auto grid-cols-1 items-start gap-4 sm:auto-rows-[60px] sm:grid-cols-6 lg:grid-cols-12">
        {widgets.map((w) => {
          const s6 = spans6.get(w.id) ?? { col: 6, row: w.layout.h };
          const s12 = spans12.get(w.id) ?? { col: 12, row: w.layout.h };
          return (
            <div
              key={w.id}
              className={`min-w-0 ${COL_SM[s6.col]} ${COL_LG[s12.col]} ${ROW_SM[s12.row] ?? 'sm:row-span-4'} h-auto ${CELL_HEIGHT}`}
              style={{ '--rows': s12.row } as CSSProperties}
            >
              <Widget widget={w} />
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => openAddWidget()}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-subtle text-sm text-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent ${COL_SM[3]} ${COL_LG[3]} ${ROW_SM[4]} h-auto ${CELL_HEIGHT} min-h-[160px]`}
          style={{ '--rows': 4 } as CSSProperties}
        >
          <Plus className="size-5" aria-hidden />
          Add widget
        </button>
      </div>
    </main>
  );
}

export function DashboardHome() {
  const hasHydrated = useDashboardHydration();
  const hasWidgets = useDashboardStore((s) => s.widgets.length > 0);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <Header />
      {hasHydrated ? (hasWidgets ? <WidgetList /> : <EmptyHero />) : <div className="flex-1" />}
      <AddWidgetModal />
    </div>
  );
}
