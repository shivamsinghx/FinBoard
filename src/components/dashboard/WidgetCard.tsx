'use client';

import { Settings2, Trash2 } from 'lucide-react';
import { useWidgetData } from '@/hooks/useWidgetData';
import { formatValue } from '@/lib/formatters';
import { getByPath } from '@/lib/jsonPaths';
import { rowsAtPath } from '@/lib/widgetFields';
import { useDashboardStore } from '@/store/dashboardStore';
import { WIDGET_TYPE_LABELS, type WidgetInstance } from '@/types/widget';

/**
 * Temporary placeholder renderer — shows a widget's title, mode and live
 * values from `useWidgetData` until the real Card/Table/Chart components
 * land. Proves the whole modal → store → proxy → render path end to end.
 */
export function WidgetCard({ widget }: { widget: WidgetInstance }) {
  const { data, status, error, errorCode, lastUpdated } = useWidgetData(
    widget.config.endpoint || null,
    widget.config.refreshIntervalSec,
  );
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const openWidgetEditor = useDashboardStore((s) => s.openWidgetEditor);
  const cfg = widget.config;

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-subtle bg-surface p-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate font-medium">{cfg.title}</h2>
        <span className="shrink-0 rounded border border-subtle bg-raised px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">
          {WIDGET_TYPE_LABELS[widget.type]}
        </span>
        <button
          type="button"
          onClick={() => openWidgetEditor(widget.id)}
          aria-label={`Edit ${cfg.title}`}
          className="flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-raised hover:text-ink"
        >
          <Settings2 className="size-3.5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => removeWidget(widget.id)}
          aria-label={`Remove ${cfg.title}`}
          className="flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-raised hover:text-down"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>

      <p className="text-xs">
        {status === 'loading' && <span className="text-faint">Loading…</span>}
        {status === 'empty' && <span className="text-faint">No URL configured.</span>}
        {status === 'error' && (
          <span className="text-down">
            {error}
            {errorCode === 'RATE_LIMIT' && ' (showing stale data)'}
          </span>
        )}
        {status === 'success' && lastUpdated && (
          <span className="text-faint">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </p>

      <WidgetBody widget={widget} data={data} />
    </article>
  );
}

function WidgetBody({ widget, data }: { widget: WidgetInstance; data: unknown }) {
  const cfg = widget.config;

  if (widget.type === 'card') {
    return (
      <ul className="space-y-1 text-sm">
        {cfg.fields.map((f) => (
          <li key={f.path} className="flex items-baseline justify-between gap-2">
            <span className="truncate text-muted">{f.label}</span>
            <span className="font-medium">
              {formatValue(getByPath(data, f.path), f.format)}
            </span>
          </li>
        ))}
        {cfg.fields.length === 0 && (
          <li className="text-xs text-faint">No fields configured.</li>
        )}
      </ul>
    );
  }

  if (widget.type === 'table') {
    const rows = cfg.table?.listPath ? rowsAtPath(data, cfg.table.listPath) : [];
    if (!cfg.fields.length) {
      return <p className="text-xs text-faint">No columns configured.</p>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-faint">
              {cfg.fields.map((f) => (
                <th key={f.path} className="truncate pb-1 pr-3 font-medium">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-t border-subtle">
                {cfg.fields.map((f) => (
                  <td key={f.path} className="truncate py-1 pr-3 text-ink">
                    {formatValue(getByPath(row, f.path), f.format)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && data !== undefined && (
          <p className="py-2 text-xs text-faint">No rows.</p>
        )}
        {rows.length > 5 && (
          <p className="pt-1 text-[11px] text-faint">+{rows.length - 5} more</p>
        )}
      </div>
    );
  }

  // chart — show the last row's mapped values as text (real chart next)
  const rows = cfg.chart?.listPath ? rowsAtPath(data, cfg.chart.listPath) : [];
  const last = rows[rows.length - 1];
  if (!last) {
    return <p className="text-xs text-faint">No series data.</p>;
  }
  const pairs: [string, unknown][] =
    cfg.chart?.kind === 'candle'
      ? (Object.entries(cfg.chart.ohlc ?? {}) as [string, string][]).map(
          ([role, key]) => [role, getByPath(last, key)],
        )
      : cfg.fields.map((f) => [f.label, getByPath(last, f.path)]);
  return (
    <div className="space-y-1 text-sm">
      <p className="text-xs text-faint">
        Last · {String(getByPath(last, cfg.chart?.xField ?? '') ?? '—')}
      </p>
      <ul className="flex flex-wrap gap-x-3">
        {pairs.map(([label, v]) => (
          <li key={label} className="text-sm">
            <span className="text-muted">{label} </span>
            <span className="font-medium">{formatValue(v, 'auto')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
