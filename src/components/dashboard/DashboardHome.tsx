'use client';

import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { useDashboardHydration, useDashboardStore } from '@/store/dashboardStore';
import type { WidgetInstance } from '@/types/widget';
import { CardWidget } from '@/components/widgets/CardWidget';
import { EmptyHero } from './EmptyHero';
import { Header } from './Header';
import { WidgetCard } from './WidgetCard';

/** The modal is heavy (explorer + pickers) — load it only when opened. */
const AddWidgetModal = dynamic(
  () => import('./AddWidgetModal').then((m) => m.AddWidgetModal),
  { ssr: false },
);

/** Card is the only real renderer so far; table/chart keep the placeholder. */
function Widget({ widget }: { widget: WidgetInstance }) {
  if (widget.type === 'card') return <CardWidget widget={widget} />;
  return <WidgetCard widget={widget} />;
}

function WidgetList() {
  const widgets = useDashboardStore((s) => s.widgets);
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <Widget key={w.id} widget={w} />
      ))}
      <button
        type="button"
        onClick={() => openAddWidget()}
        className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-subtle text-sm text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-5" aria-hidden />
        Add widget
      </button>
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
