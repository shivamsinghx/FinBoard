'use client';

import { useState, type ReactNode } from 'react';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { refetchUrl } from '@/hooks/useWidgetData';
import { urlWithSymbol } from '@/lib/cardDisplay';
import { useDashboardStore } from '@/store/dashboardStore';

/**
 * Dashboard heading + actions: "My dashboard" with a live widget count,
 * Refresh all (refetches every widget URL through the shared cache —
 * duplicate URLs dedupe into one request), Export (JSON download), and
 * Add widget.
 */
export function DashboardToolbar() {
  const widgets = useDashboardStore((s) => s.widgets);
  const exportDashboard = useDashboardStore((s) => s.exportDashboard);
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshAll() {
    setRefreshing(true);
    try {
      const urls = new Set<string>();
      for (const w of widgets) {
        urls.add(w.config.endpoint);
        // Symbol watchlists poll one quote URL per symbol.
        if (
          w.type === 'card' &&
          !w.config.card?.listPath &&
          w.config.card?.symbols?.length
        ) {
          for (const s of w.config.card.symbols) {
            urls.add(urlWithSymbol(w.config.endpoint, s));
          }
        }
      }
      await Promise.allSettled([...urls].map(refetchUrl));
    } finally {
      setRefreshing(false);
    }
  }

  function onExport() {
    const blob = new Blob([exportDashboard()], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'finboard-dashboard.json';
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-7">
      <div>
        <h1 className="font-display text-[28px] leading-none tracking-tight">
          My dashboard
        </h1>
        <p className="mt-1.5 text-xs text-muted">
          {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'} ·
          auto-refreshing
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ToolbarButton onClick={refreshAll} disabled={refreshing} label="Refresh all">
          <RefreshCw
            className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
            aria-hidden
          />
          <span className="hidden sm:inline">Refresh all</span>
        </ToolbarButton>
        <ToolbarButton onClick={onExport} label="Export dashboard">
          <Download className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Export</span>
        </ToolbarButton>
        <button
          type="button"
          onClick={() => openAddWidget()}
          aria-label="Add widget"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Add widget</span>
        </button>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center gap-1.5 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
