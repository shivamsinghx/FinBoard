'use client';

import { Trash2 } from 'lucide-react';
import { useDashboardHydration, useDashboardStore } from '@/store/dashboardStore';
import { WIDGET_TYPE_LABELS } from '@/types/widget';
import { AddWidgetModal } from './AddWidgetModal';
import { EmptyHero } from './EmptyHero';
import { Header } from './Header';

/** Temporary stand-in until the drag-and-drop grid ships. */
function WidgetList() {
  const widgets = useDashboardStore((s) => s.widgets);
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <article
          key={w.id}
          className="flex flex-col gap-2 rounded-xl border border-subtle bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{w.config.title}</h2>
            <button
              type="button"
              onClick={() => removeWidget(w.id)}
              aria-label={`Remove ${w.config.title}`}
              className="flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-raised hover:text-down"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {WIDGET_TYPE_LABELS[w.type]}
          </p>
          {w.config.endpoint && (
            <p className="truncate text-xs text-faint">{w.config.endpoint}</p>
          )}
        </article>
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
