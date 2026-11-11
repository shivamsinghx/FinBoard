'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Download,
  LayoutTemplate,
  Plus,
  RefreshCw,
  Upload,
} from 'lucide-react';
import {
  exportDashboardJson,
  pickAndImportDashboard,
  refreshAllWidgets,
} from '@/lib/dashboardActions';
import { TEMPLATES } from '@/lib/templates';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Dashboard heading + actions: "My dashboard" with a live widget count,
 * a joined Import / Export / Refresh-all group, a Templates menu, and
 * the primary Add widget button.
 */
export function DashboardToolbar() {
  const widgets = useDashboardStore((s) => s.widgets);
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const requestTemplate = useDashboardStore((s) => s.requestTemplate);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefreshAll() {
    setRefreshing(true);
    try {
      await refreshAllWidgets();
    } finally {
      setRefreshing(false);
    }
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
        <ButtonGroup className="rounded-lg shadow-none">
          <Button
            variant="outline"
            size="sm"
            className="border-subtle text-muted hover:text-ink"
            onClick={pickAndImportDashboard}
            aria-label="Import dashboard"
          >
            <Upload className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-subtle text-muted hover:text-ink"
            onClick={exportDashboardJson}
            aria-label="Export dashboard"
          >
            <Download className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-subtle text-muted hover:text-ink"
            onClick={onRefreshAll}
            disabled={refreshing}
            aria-label="Refresh all widgets"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            <span className="hidden sm:inline">Refresh all</span>
          </Button>
        </ButtonGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-subtle text-muted hover:text-ink"
                aria-label="Load a template"
              />
            }
          >
            <LayoutTemplate className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Templates</span>
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {TEMPLATES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => requestTemplate(t.id)}
              >
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-[11px] leading-snug text-faint">
                    {t.description} · {t.payload.widgets.length} widgets
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={() => openAddWidget()}
          aria-label="Add widget"
          className="gap-1.5"
        >
          <Plus className="size-4" aria-hidden />
          <span className="hidden sm:inline">Add widget</span>
        </Button>
      </div>
    </div>
  );
}
