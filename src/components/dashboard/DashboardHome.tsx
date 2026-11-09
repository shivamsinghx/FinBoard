'use client';

import dynamic from 'next/dynamic';
import { useDashboardHydration, useDashboardStore } from '@/store/dashboardStore';
import { EmptyHero } from './EmptyHero';
import { Header } from './Header';
import { WidgetCard } from './WidgetCard';

/** The modal is heavy (explorer + pickers) — load it only when opened. */
const AddWidgetModal = dynamic(
  () => import('./AddWidgetModal').then((m) => m.AddWidgetModal),
  { ssr: false },
);

function WidgetList() {
  const widgets = useDashboardStore((s) => s.widgets);

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <WidgetCard key={w.id} widget={w} />
      ))}
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
