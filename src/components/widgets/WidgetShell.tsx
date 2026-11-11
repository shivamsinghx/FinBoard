'use client';

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  Copy,
  Ellipsis,
  GripVertical,
  Info,
  Pencil,
  RefreshCw,
  SearchX,
  Settings2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type { WidgetDataResult } from '@/hooks/useWidgetData';
import { docErrorSlug } from '@/lib/docsSections';
import { formatInterval } from '@/lib/formatters';
import { FRIENDLY_ERRORS } from '@/lib/proxyErrors';
import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetInstance, WidgetType } from '@/types/widget';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WidgetShellProps {
  widget: WidgetInstance;
  /** Result of the widget's own useWidgetData call. */
  query: WidgetDataResult;
  /** True when the payload resolves to nothing displayable. */
  empty: boolean;
  /** Optional controls rendered in the header between title and actions. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome + data states for every widget type.
 *
 * Header: drag handle, name, info hover card, refresh-interval badge,
 * refresh + settings icon buttons (tooltipped), and a "⋯" menu holding
 * Edit/Duplicate/Delete so the header stays clean at small widths.
 * Footer: last-updated time + live badge. Body renders one of:
 * type-shaped shimmer skeleton (first fetch), fatal error with Retry,
 * stale-data amber bar + children, or an empty-fields state.
 */
export function WidgetShell({ widget, query, empty, headerExtra, children }: WidgetShellProps) {
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

  /** hostname + path only — query params can carry API keys. */
  const endpointLabel = useMemo(() => {
    try {
      const u = new URL(cfg.endpoint);
      return `${u.hostname}${u.pathname}`;
    } catch {
      return cfg.endpoint;
    }
  }, [cfg.endpoint]);

  return (
    <Card
      size="sm"
      className="relative h-full min-h-[160px] gap-0 rounded-2xl border-subtle bg-surface py-0 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-0"
    >
      <CardHeader className="flex flex-row items-center gap-1.5 px-3 py-2">
        <GripVertical
          className="size-3.5 shrink-0 cursor-grab text-faint/70"
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium">{cfg.title}</h3>
        {!fatal && !unusable && status !== 'loading' && headerExtra}
        {cfg.description && (
          <HoverCard>
            <HoverCardTrigger
              render={
                <span
                  className="flex shrink-0 cursor-help items-center"
                  aria-label={cfg.description}
                />
              }
            >
              <Info className="size-3.5 text-faint" aria-hidden />
            </HoverCardTrigger>
            <HoverCardContent
              side="bottom"
              align="start"
              className="w-64 space-y-1.5 text-xs"
            >
              <p className="leading-snug">{cfg.description}</p>
              <p className="truncate font-mono text-[10px] text-faint" title={endpointLabel}>
                {endpointLabel}
              </p>
              <p className="text-[10px] text-faint">
                Refreshes every {formatInterval(cfg.refreshIntervalSec)}
              </p>
            </HoverCardContent>
          </HoverCard>
        )}
        <Badge
          variant="secondary"
          className="shrink-0 text-[10px] font-medium text-faint"
        >
          {formatInterval(cfg.refreshIntervalSec)}
        </Badge>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full text-faint hover:text-ink"
                onClick={refetch}
                disabled={status === 'empty'}
                aria-label={`Refresh ${cfg.title}`}
              />
            }
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`}
              aria-hidden
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full text-faint hover:text-ink"
                onClick={() => openWidgetEditor(widget.id)}
                aria-label={`Settings for ${cfg.title}`}
              />
            }
          >
            <Settings2 className="size-3.5" aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-full text-faint hover:text-ink"
                aria-label={`${cfg.title} actions`}
              />
            }
          >
            <Ellipsis className="size-3.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <DropdownMenuItem onClick={() => openWidgetEditor(widget.id)}>
              <Pencil aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateWidget(widget.id)}>
              <Copy aria-hidden />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <Separator className="bg-subtle/60" />

      {stale && (
        <div className="flex items-center gap-1.5 border-b border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-700">
          <AlertTriangle className="size-3 shrink-0" aria-hidden />
          <span className="truncate">
            Showing last data ·{' '}
            {errorCode === 'RATE_LIMIT'
              ? 'API limit reached — retrying in 60s.'
              : FRIENDLY_ERRORS[errorCode ?? 'NETWORK']}
          </span>
          {errorCode && (
            <Link
              href={`/docs#${docErrorSlug(errorCode)}`}
              className="ml-auto shrink-0 font-medium underline-offset-2 hover:underline"
            >
              Why?
            </Link>
          )}
        </div>
      )}

      <CardContent className="min-h-0 flex-1 scroll-fade-y overflow-y-auto p-3">
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
      </CardContent>

      <CardFooter className="justify-between border-subtle/60 bg-transparent px-3 py-1.5">
        <span className="text-[10px] text-faint">
          {lastUpdated
            ? `Last updated ${new Date(lastUpdated).toLocaleTimeString('en-GB')}`
            : 'Not fetched yet'}
        </span>
        {hasData && (
          <Badge
            variant="outline"
            className="gap-1.5 border-up/40 text-[10px] text-up"
          >
            <LiveDot key={lastUpdated} />
            Live
          </Badge>
        )}
      </CardFooter>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="rounded-2xl border-subtle bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{cfg.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This widget will be removed from your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removeWidget(widget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
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
    <span className="relative flex size-1.5">
      {ping && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-up/70" />
      )}
      <span className="relative inline-flex size-1.5 rounded-full bg-up" />
    </span>
  );
}

/**
 * Type-shaped loading state. `shimmer` is a text-clip gradient utility,
 * so `bg-clip-border!` + `text-raised` repurpose it to sweep the block.
 */
function ShimmerSkeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Skeleton
      className={`shimmer animate-none bg-clip-border! text-raised ${className ?? ''}`}
      style={style}
    />
  );
}

function SkeletonBody({ kind }: { kind: WidgetType }) {
  if (kind === 'chart') {
    return (
      <div className="flex h-full min-h-24 items-end gap-1.5 pb-1">
        {[45, 70, 55, 85, 60, 75, 50].map((h, i) => (
          <ShimmerSkeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    );
  }
  const rows = kind === 'table' ? 6 : 4;
  return (
    <div className="space-y-2.5 pt-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <ShimmerSkeleton
            className="h-3"
            style={{ width: `${52 + ((i * 19) % 28)}%` }}
          />
          <ShimmerSkeleton className="h-3 w-1/5" />
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
      <div className="mt-1 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
        {code && (
          <Button variant="ghost" size="sm" render={<Link href={`/docs#${docErrorSlug(code)}`} />}>
            Docs
          </Button>
        )}
      </div>
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
    <Empty className="h-full min-h-20 justify-center gap-1.5 py-4">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-xs font-normal text-muted">
          {message}
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" className="mt-1" onClick={onEdit}>
          {actionLabel}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
