'use client';

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ColumnInfo, OhlcGuess } from '@/lib/widgetFields';
import type {
  CardColumnMap,
  ChartKind,
  DataFormat,
  FieldMapping,
} from '@/types/widget';

const FORMAT_OPTIONS: { value: DataFormat; label: string }[] = [
  { value: 'auto', label: 'auto' },
  { value: 'number', label: 'number' },
  { value: 'currency', label: 'currency' },
  { value: 'percent', label: 'percent' },
  { value: 'date', label: 'date' },
];

const CHART_TYPES: { value: ChartKind; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'candle', label: 'Candle' },
];

const OHLC_ROLES = [
  { key: 'open', label: 'Open' },
  { key: 'high', label: 'High' },
  { key: 'low', label: 'Low' },
  { key: 'close', label: 'Close' },
] as const;

/* ------------------------------------------------------------------ */
/* FieldList — reorderable selected-field rows (card/table/line/area)   */
/* ------------------------------------------------------------------ */

export function FieldList({
  fields,
  onChange,
  emptyHint = 'No fields yet — click + on a field above.',
}: {
  fields: FieldMapping[];
  onChange: (fields: FieldMapping[]) => void;
  emptyHint?: string;
}) {
  function update(i: number, patch: Partial<FieldMapping>) {
    onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function remove(i: number) {
    onChange(fields.filter((_, j) => j !== i));
  }

  if (fields.length === 0) {
    return <p className="mt-2 text-xs text-faint">{emptyHint}</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {fields.map((f, i) => (
        <li key={f.path} className="flex items-center gap-1.5">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${f.label} up`}
              className="rounded p-0.5 text-faint transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowUp className="size-3" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === fields.length - 1}
              aria-label={`Move ${f.label} down`}
              className="rounded p-0.5 text-faint transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowDown className="size-3" aria-hidden />
            </button>
          </div>

          <span
            title={f.path}
            className="min-w-0 flex-1 truncate font-mono text-[11px] text-faint"
          >
            {f.path}
          </span>

          <input
            type="text"
            value={f.label}
            onChange={(e) => update(i, { label: e.target.value })}
            aria-label="Field label"
            className="w-28 shrink-0 rounded-md border border-subtle bg-raised px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
          />

          <select
            value={f.format}
            onChange={(e) => update(i, { format: e.target.value as DataFormat })}
            aria-label="Field format"
            className="shrink-0 rounded-md border border-subtle bg-raised px-1.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Remove ${f.label}`}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-down/10 hover:text-down"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* ChartFields — chart type, x field, and y/OHLC mapping                */
/* ------------------------------------------------------------------ */

interface ChartFieldsProps {
  columns: ColumnInfo[];
  chartType: ChartKind;
  onChartType: (kind: ChartKind) => void;
  xField: string | null;
  onXField: (key: string | null) => void;
  /** Line/area y-value fields. */
  values: FieldMapping[];
  onValues: (fields: FieldMapping[]) => void;
  /** Candle open/high/low/close → column key mapping. */
  ohlc: OhlcGuess;
  onOhlc: (guess: OhlcGuess) => void;
}

export function ChartFields({
  columns,
  chartType,
  onChartType,
  xField,
  onXField,
  values,
  onValues,
  ohlc,
  onOhlc,
}: ChartFieldsProps) {
  return (
    <div className="mt-2 space-y-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
          Chart type
        </p>
        <div className="mt-1.5 inline-flex gap-1 rounded-full border border-subtle bg-raised p-1">
          {CHART_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChartType(t.value)}
              aria-pressed={chartType === t.value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                chartType === t.value
                  ? 'bg-surface text-ink shadow-sm ring-1 ring-subtle'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ColumnSelect
        label="X axis (date / time)"
        value={xField}
        columns={columns}
        onChange={onXField}
      />

      {chartType === 'candle' ? (
        <div className="grid grid-cols-2 gap-2">
          {OHLC_ROLES.map((role) => (
            <ColumnSelect
              key={role.key}
              label={role.label}
              value={ohlc[role.key] ?? null}
              columns={columns}
              onChange={(key) => onOhlc({ ...ohlc, [role.key]: key ?? undefined })}
            />
          ))}
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
            Value fields
          </p>
          <FieldList
            fields={values}
            onChange={onValues}
            emptyHint="No value fields yet — click + on a column above."
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CardColumnFields — name/price/change mapping for list-style cards    */
/* ------------------------------------------------------------------ */

const CARD_COLUMN_ROLES = [
  { key: 'name', label: 'Name column' },
  { key: 'price', label: 'Price column' },
  { key: 'change', label: 'Change % column' },
] as const;

/**
 * Three selects mapping card roles to column keys — used by
 * movers/watchlist card types. With `nameIsSymbol` the Name select is
 * pinned: rows display the symbol itself (symbol-based watchlists).
 */
export function CardColumnFields({
  options,
  value,
  onChange,
  nameIsSymbol = false,
}: {
  options: string[];
  value: CardColumnMap;
  onChange: (map: CardColumnMap) => void;
  nameIsSymbol?: boolean;
}) {
  // Keys claimed by other roles are hidden from each select, and picking
  // one clears the conflicting role — a column can never serve two roles.
  const taken = new Set(
    CARD_COLUMN_ROLES.map((r) => value[r.key]).filter((k): k is string => !!k),
  );
  function pick(role: keyof CardColumnMap, key: string | undefined) {
    const next: CardColumnMap = { ...value, [role]: key };
    if (key) {
      for (const r of CARD_COLUMN_ROLES) {
        if (r.key !== role && next[r.key] === key) next[r.key] = undefined;
      }
    }
    onChange(next);
  }

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {CARD_COLUMN_ROLES.map(({ key, label }) => {
        const pinSymbol = key === 'name' && nameIsSymbol;
        const roleOptions = pinSymbol
          ? []
          : options.filter((k) => k === value[key] || !taken.has(k));
        return (
          <label key={key} className="block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
              {label}
            </span>
            <select
              value={pinSymbol ? '' : (value[key] ?? '')}
              disabled={pinSymbol}
              onChange={(e) => pick(key, e.target.value || undefined)}
              className="mt-1 w-full rounded-md border border-subtle bg-raised px-2 py-1.5 text-xs text-ink outline-none focus:border-accent disabled:opacity-60"
            >
              <option value="">
                {pinSymbol ? '— symbol —' : '— none —'}
              </option>
              {roleOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string | null;
  columns: ColumnInfo[];
  onChange: (key: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 w-full rounded-md border border-subtle bg-raised px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
      >
        <option value="">— pick a column —</option>
        {columns.map((c) => (
          <option key={c.key} value={c.key}>
            {c.key}
          </option>
        ))}
      </select>
    </label>
  );
}
