'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Copy,
  GripVertical,
  Info,
  RefreshCw,
  SearchX,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { WidgetDataResult } from '@/hooks/useWidgetData';
import { formatInterval } from '@/lib/formatters';
import { FRIENDLY_ERRORS } from '@/lib/proxyErrors';
import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetInstance, WidgetType } from '@/types/widget';

interface WidgetShellProps {
  widget: WidgetInstance;
  /** Result of the widget's own useWidgetData call. */
  query: WidgetDataResult;
  /** True when the payload resolves to nothing displayable. */
  empty: boolean;
  children: ReactNode;
}

/**
 * Shared chrome + data states for every widget type.
 *
 * Header: drag handle, name, description tooltip, refresh-interval badge,
 * refresh/settings/duplicate/delete actions. Footer: last-updated time +
 * live pulse. Body renders one of: type-shaped skeleton (first fetch),
 * fatal error with Retry, stale-data amber bar + children, or an
 * empty-fields state with an "Edit fields" button.
 */
export function WidgetShell({ widget, query, empty, children }: WidgetShellProps) {
  const openWidgetEditor = useDashboardStore((s) => s.openWidgetEditor);
  const duplicateWidget = useDashboardStore((s) => s.duplicateWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const [confirming, setConfirming] = useState(false);

  const { data, status, error, errorCode, lastUpdated, isFetching, refetch } = query;
  const cfg = widget.config;
  const hasData = data !== undefined;
  const stale = status === 'error' && hasData;
  const fatal = status === 'error' && !hasData;
  const unusable = !fatal && !stale && status !== 'loading' && (status === 'empty' || empty);

  return (
    <article className="relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-xl border border-subtle bg-surface">
      <header className="flex items-center gap-1.5 border-b border-subtle/60 px-3 py-2">
        <GripVertical
          className="size-3.5 shrink-0 cursor-grab text-faint/70"
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{cfg.title}</h3>
        {cfg.description && (
          <span
            className="flex shrink-0 cursor-help items-center"
            title={cfg.description}
            aria-label={cfg.description}
          >
            <Info className="size-3.5 text-faint" aria-hidden />
          </span>
        )}
        <span className="shrink-0 rounded bg-raised px-1.5 py-0.5 text-[10px] font-medium text-faint">
          {formatInterval(cfg.refreshIntervalSec)}
        </span>
        <ShellButton
          label={`Refresh ${cfg.title}`}
          onClick={refetch}
          disabled={status === 'empty'}
        >
          <RefreshCw
            className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden
          />
        </ShellButton>
        <ShellButton label={`Edit ${cfg.title}`} onClick={() => openWidgetEditor(widget.id)}>
          <Settings2 className="size-3.5" aria-hidden />
        </ShellButton>
        <ShellButton label={`Duplicate ${cfg.title}`} onClick={() => duplicateWidget(widget.id)}>
          <Copy className="size-3.5" aria-hidden />
        </ShellButton>
        <ShellButton
          label={`Delete ${cfg.title}`}
          danger
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </ShellButton>
      </header>

      {stale && (
        <div className="flex items-center gap-1.5 border-b border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            Showing last data ·{' '}
            {errorCode === 'RATE_LIMIT'
              ? 'API limit reached — retrying in 60s.'
              : FRIENDLY_ERRORS[errorCode ?? 'NETWORK']}
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {status === 'loading' ? (
          <SkeletonBody kind={widget.type} />
        ) : fatal ? (
          <ErrorState code={errorCode} detail={error} onRetry={refetch} />
        ) : unusable ? (
          <EmptyState
            message={
              status === 'empty'
                ? 'No URL configured on this widget.'
                : 'No data at the selected fields.'
            }
            actionLabel={status === 'empty' ? 'Edit widget' : 'Edit fields'}
            onEdit={() => openWidgetEditor(widget.id)}
          />
        ) : (
          children
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-subtle/60 px-3 py-1.5">
        <span className="text-[10px] text-faint">
          {lastUpdated
            ? `Last updated ${new Date(lastUpdated).toLocaleTimeString('en-GB')}`
            : 'Not fetched yet'}
        </span>
        {hasData && <LiveDot key={lastUpdated} />}
      </footer>

      {confirming && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setConfirming(false)}
          />
          <div className="absolute right-3 top-11 z-20 w-48 rounded-lg border border-subtle bg-surface p-3 shadow-lg">
            <p className="text-xs text-ink">Delete “{cfg.title}”?</p>
            <div className="mt-2.5 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeWidget(widget.id)}
                className="rounded-md bg-down px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function ShellButton({
  label,
  onClick,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-raised disabled:pointer-events-none disabled:opacity-40 ${
        danger ? 'hover:text-down' : 'hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Green dot that pings briefly on each successful refresh (key = lastUpdated). */
function LiveDot() {
  const [ping, setPing] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPing(false), 1200);
    return () => clearTimeout(t);
  }, []);
  return (
    <span className="relative flex size-1.5" title="Live">
      {ping && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-up/70" />
      )}
      <span className="relative inline-flex size-1.5 rounded-full bg-up" />
    </span>
  );
}

function SkeletonBody({ kind }: { kind: WidgetType }) {
  if (kind === 'chart') {
    return (
      <div className="flex h-full min-h-24 animate-pulse items-end gap-1.5 pb-1">
        {[45, 70, 55, 85, 60, 75, 50].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-raised" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }
  const rows = kind === 'table' ? 6 : 4;
  return (
    <div className="animate-pulse space-y-2.5 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="h-3 rounded bg-raised" style={{ width: `${52 + ((i * 19) % 28)}%` }} />
          <div className="h-3 w-1/5 rounded bg-raised" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  code,
  detail,
  onRetry,
}: {
  code: WidgetDataResult['errorCode'];
  detail: string | null;
  onRetry: () => void;
}) {
  const friendly = FRIENDLY_ERRORS[code ?? 'NETWORK'];
  return (
    <div className="flex h-full min-h-20 flex-col items-center justify-center gap-1.5 py-4 text-center">
      <AlertTriangle className="size-5 text-down/80" aria-hidden />
      <p className="text-xs text-muted">{friendly}</p>
      {detail && detail !== friendly && (
        <p className="max-w-full truncate text-[10px] text-faint" title={detail}>
          {detail}
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-md border border-subtle bg-raised px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-strong"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({
  message,
  actionLabel,
  onEdit,
}: {
  message: string;
  actionLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex h-full min-h-20 flex-col items-center justify-center gap-1.5 py-4 text-center">
      <SearchX className="size-5 text-faint" aria-hidden />
      <p className="text-xs text-muted">{message}</p>
      <button
        type="button"
        onClick={onEdit}
        className="mt-1 rounded-md border border-subtle bg-raised px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-strong"
      >
        {actionLabel}
      </button>
    </div>
  );
}
