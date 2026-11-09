'use client';

import { useEffect, useRef, useState } from 'react';
import { useWidgetData } from '@/hooks/useWidgetData';
import { formatValue, toNumber } from '@/lib/formatters';
import { getByPath } from '@/lib/jsonPaths';
import { guessListColumns, looksLikeChange, urlWithSymbol } from '@/lib/cardDisplay';
import { rowsAtPath } from '@/lib/widgetFields';
import type { CardColumnMap, CardKind, FieldMapping, WidgetInstance } from '@/types/widget';
import { WidgetShell } from './WidgetShell';

const LIST_KINDS: CardKind[] = ['watchlist', 'gainers', 'losers'];
const MAX_LIST_ROWS = 10;
const FLASH_MS = 1000;

/**
 * Card widget: label–value rows (or a 1–2 field hero layout) over
 * `config.fields`. Watchlist/gainers/losers kinds render compact
 * name/price/change rows from `card.listPath` instead.
 */
export function CardWidget({ widget }: { widget: WidgetInstance }) {
  const cfg = widget.config;
  const query = useWidgetData(cfg.endpoint || null, cfg.refreshIntervalSec);
  const kind = cfg.card?.kind ?? 'quote';
  const isList = LIST_KINDS.includes(kind) && !!cfg.card?.listPath;
  const isSymbols =
    kind === 'watchlist' &&
    !cfg.card?.listPath &&
    (cfg.card?.symbols?.length ?? 0) > 0;
  const rows = isList ? rowsAtPath(query.data, cfg.card!.listPath!) : [];

  const empty = isList
    ? rows.length === 0
    : isSymbols
      ? false
      : cfg.fields.length === 0 ||
        cfg.fields.every((f) => getByPath(query.data, f.path) === undefined);

  // Flash values green/red for ~1s when they move between refreshes.
  // setState goes inside the timeouts (not the effect body) so the lint
  // rule against cascading synchronous renders stays happy — a 0ms
  // delay is imperceptible for a flash cue.
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({});
  const prevRef = useRef<Record<string, unknown>>({});
  useEffect(() => {
    const diffs: Record<string, 'up' | 'down'> = {};
    for (const f of cfg.fields) {
      const cur = getByPath(query.data, f.path);
      const p = toNumber(prevRef.current[f.path]);
      const c = toNumber(cur);
      if (p !== null && c !== null && c !== p) diffs[f.path] = c > p ? 'up' : 'down';
      prevRef.current[f.path] = cur;
    }
    if (Object.keys(diffs).length === 0) return;
    const on = setTimeout(() => setFlash(diffs), 0);
    const off = setTimeout(() => setFlash({}), FLASH_MS + 16);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [query.data, cfg.fields]);

  return (
    <WidgetShell widget={widget} query={query} empty={empty}>
      {isList ? (
        <ListRows rows={rows} kind={kind} columns={cfg.card?.columns} />
      ) : isSymbols ? (
        <SymbolRows widget={widget} />
      ) : cfg.fields.length <= 2 ? (
        <HeroFields fields={cfg.fields} data={query.data} flash={flash} />
      ) : (
        <FieldRows fields={cfg.fields} data={query.data} flash={flash} />
      )}
    </WidgetShell>
  );
}

/* ------------------------------------------------------------------ */
/* Quote-style bodies                                                   */
/* ------------------------------------------------------------------ */

function HeroFields({
  fields,
  data,
  flash,
}: {
  fields: FieldMapping[];
  data: unknown;
  flash: Record<string, 'up' | 'down'>;
}) {
  const [primary, secondary] = fields;
  return (
    <div className="flex h-full min-h-16 flex-col justify-center gap-1">
      {primary && (
        <>
          <p className="truncate text-xs text-muted">{primary.label}</p>
          <FieldValue field={primary} data={data} flash={flash} big />
        </>
      )}
      {secondary && (
        <p className="mt-1 truncate text-sm">
          <span className="text-muted">{secondary.label} </span>
          <FieldValue field={secondary} data={data} flash={flash} />
        </p>
      )}
    </div>
  );
}

function FieldRows({
  fields,
  data,
  flash,
}: {
  fields: FieldMapping[];
  data: unknown;
  flash: Record<string, 'up' | 'down'>;
}) {
  return (
    <ul className="space-y-1.5">
      {fields.map((f) => (
        <li key={f.path} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate text-muted">{f.label}</span>
          <FieldValue field={f} data={data} flash={flash} />
        </li>
      ))}
    </ul>
  );
}

/** Formatted value with change-coloring and the up/down flash. */
function FieldValue({
  field,
  data,
  flash,
  big,
}: {
  field: FieldMapping;
  data: unknown;
  flash: Record<string, 'up' | 'down'>;
  big?: boolean;
}) {
  const value = getByPath(data, field.path);
  const n = toNumber(value);
  const change = looksLikeChange(field);
  const dir = n === null ? 0 : n > 0 ? 1 : n < 0 ? -1 : 0;
  const fl = flash[field.path];

  return (
    <span
      className={`shrink-0 rounded px-1 font-medium tabular-nums transition-colors duration-500 ${
        big ? 'text-2xl' : ''
      } ${fl === 'up' ? 'bg-up/15 text-up' : fl === 'down' ? 'bg-down/15 text-down' : ''} ${
        change && !fl
          ? dir > 0
            ? 'text-up'
            : dir < 0
              ? 'text-down'
              : 'text-muted'
          : ''
      }`}
    >
      {change && dir !== 0 && (
        <span className="mr-1 text-[0.8em]">{dir > 0 ? '▲' : '▼'}</span>
      )}
      {formatValue(value, field.format)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Watchlist / gainers / losers body                                    */
/* ------------------------------------------------------------------ */

function ListRows({
  rows,
  kind,
  columns,
}: {
  rows: Record<string, unknown>[];
  kind: CardKind;
  columns?: CardColumnMap;
}) {
  // Saved mapping wins; runtime guesses fill whatever wasn't mapped.
  const guessed = guessListColumns(rows[0] ? Object.keys(rows[0]) : []);
  const nameKey =
    columns?.name ?? guessed.name ?? (rows[0] ? Object.keys(rows[0])[0] : '');
  const priceKey = columns?.price ?? guessed.price;
  const changeKey = columns?.change ?? guessed.change;

  const sorted =
    kind === 'watchlist' || !changeKey
      ? rows
      : [...rows].sort((a, b) => {
          const d = (toNumber(b[changeKey]) ?? 0) - (toNumber(a[changeKey]) ?? 0);
          return kind === 'gainers' ? d : -d;
        });

  return (
    <ul className="divide-y divide-subtle/60">
      {sorted.slice(0, MAX_LIST_ROWS).map((row, i) => {
        const cn = changeKey ? toNumber(row[changeKey]) : null;
        return (
          <li key={i} className="flex items-baseline gap-2 py-1.5 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">
              {String(row[nameKey] ?? '—')}
            </span>
            {priceKey && (
              <span className="shrink-0 tabular-nums text-muted">
                {formatValue(row[priceKey], 'auto')}
              </span>
            )}
            {changeKey && (
              <span
                className={`w-16 shrink-0 text-right tabular-nums ${
                  cn === null ? 'text-muted' : cn > 0 ? 'text-up' : cn < 0 ? 'text-down' : 'text-muted'
                }`}
              >
                {cn !== null && cn !== 0 && <span className="mr-0.5 text-[0.8em]">{cn > 0 ? '▲' : '▼'}</span>}
                {formatValue(row[changeKey], 'percent')}
              </span>
            )}
          </li>
        );
      })}
      {sorted.length === 0 && <li className="py-2 text-xs text-faint">No rows.</li>}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Symbol-based watchlist — one quote request per symbol                */
/* ------------------------------------------------------------------ */

function SymbolRows({ widget }: { widget: WidgetInstance }) {
  const { endpoint, refreshIntervalSec, card } = widget.config;
  const symbols = card?.symbols ?? [];
  return (
    <ul className="divide-y divide-subtle/60">
      {symbols.map((s) => (
        <SymbolRow
          key={s}
          symbol={s}
          endpoint={endpoint}
          interval={refreshIntervalSec}
          columns={card?.columns}
        />
      ))}
    </ul>
  );
}

/**
 * A single watchlist row backed by its own useWidgetData call — the
 * shared cache dedupes identical quote URLs, and each row polls on the
 * widget's interval.
 */
function SymbolRow({
  symbol,
  endpoint,
  interval,
  columns,
}: {
  symbol: string;
  endpoint: string;
  interval: number;
  columns?: CardColumnMap;
}) {
  const q = useWidgetData(urlWithSymbol(endpoint, symbol), interval);
  const rec =
    q.data && typeof q.data === 'object'
      ? (q.data as Record<string, unknown>)
      : null;

  if (!rec) {
    const failed = q.status === 'error';
    return (
      <li className="flex items-baseline gap-2 py-1.5 text-sm">
        <span className="min-w-0 flex-1 truncate font-medium">{symbol}</span>
        {failed ? (
          <span className="shrink-0 text-xs text-faint" title={q.error ?? ''}>
            unavailable
          </span>
        ) : (
          <span className="h-3 w-16 animate-pulse rounded bg-raised" />
        )}
      </li>
    );
  }

  const guessed = guessListColumns(Object.keys(rec));
  const priceKey = columns?.price ?? guessed.price;
  const changeKey = columns?.change ?? guessed.change;
  const cn = changeKey ? toNumber(getByPath(rec, changeKey)) : null;

  return (
    <li className="flex items-baseline gap-2 py-1.5 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium">{symbol}</span>
      {priceKey && (
        <span className="shrink-0 tabular-nums text-muted">
          {formatValue(getByPath(rec, priceKey), 'auto')}
        </span>
      )}
      {changeKey && (
        <span
          className={`w-16 shrink-0 text-right tabular-nums ${
            cn === null ? 'text-muted' : cn > 0 ? 'text-up' : cn < 0 ? 'text-down' : 'text-muted'
          }`}
        >
          {cn !== null && cn !== 0 && (
            <span className="mr-0.5 text-[0.8em]">{cn > 0 ? '▲' : '▼'}</span>
          )}
          {formatValue(getByPath(rec, changeKey), 'percent')}
        </span>
      )}
    </li>
  );
}
