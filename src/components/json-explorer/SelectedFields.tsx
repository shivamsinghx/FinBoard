'use client';

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ColumnInfo, OhlcGuess } from '@/lib/widgetFields';
import type {
  CardColumnMap,
  ChartKind,
  DataFormat,
  FieldMapping,
} from '@/types/widget';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FORMAT_OPTIONS: { value: DataFormat; label: string }[] = [
  { value: 'auto', label: 'auto' },
  { value: 'number', label: 'number' },
  { value: 'currency', label: 'currency' },
  { value: 'percent', label: 'percent' },
  { value: 'date', label: 'date' },
];

const FORMAT_LABELS = Object.fromEntries(
  FORMAT_OPTIONS.map((o) => [o.value, o.label]),
);

const CHART_TYPES: { value: ChartKind; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'candle', label: 'Candle' },
];

const CHART_LABELS = Object.fromEntries(
  CHART_TYPES.map((t) => [t.value, t.label]),
);

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
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${f.label} up`}
            >
              <ArrowUp className="size-3" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => move(i, 1)}
              disabled={i === fields.length - 1}
              aria-label={`Move ${f.label} down`}
            >
              <ArrowDown className="size-3" aria-hidden />
            </Button>
          </div>

          <span
            title={f.path}
            className="min-w-0 flex-1 truncate font-mono text-[11px] text-faint"
          >
            {f.path}
          </span>

          <Input
            value={f.label}
            onChange={(e) => update(i, { label: e.target.value })}
            aria-label="Field label"
            className="h-7 w-28 shrink-0 px-2 text-xs"
          />

          <Select
            items={FORMAT_LABELS}
            value={f.format}
            onValueChange={(v) => v && update(i, { format: v as DataFormat })}
          >
            <SelectTrigger size="sm" aria-label="Field format" className="w-[104px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => remove(i)}
            aria-label={`Remove ${f.label}`}
            className="text-faint hover:bg-down/10 hover:text-down"
          >
            <X className="size-3.5" aria-hidden />
          </Button>
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
  const columnKeys = columns.map((c) => c.key);
  return (
    <div className="mt-2 space-y-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
          Chart type
        </p>
        <Select
          items={CHART_LABELS}
          value={chartType}
          onValueChange={(v) => v && onChartType(v as ChartKind)}
        >
          <SelectTrigger size="sm" className="mt-1.5 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ColumnSelect
        label="X axis (date / time)"
        value={xField}
        options={columnKeys}
        onChange={onXField}
      />

      {chartType === 'candle' ? (
        <div className="grid grid-cols-2 gap-2">
          {OHLC_ROLES.map((role) => (
            <ColumnSelect
              key={role.key}
              label={role.label}
              value={ohlc[role.key] ?? null}
              options={columnKeys}
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
 * Three comboboxes mapping card roles to column keys — used by
 * movers/watchlist card types. With `nameIsSymbol` the Name picker is
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
  // Keys claimed by other roles are hidden from each picker, and picking
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
          <div key={key}>
            <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
              {label}
            </span>
            <ColumnSelect
              label={label}
              hideLabel
              value={pinSymbol ? null : (value[key] ?? null)}
              options={roleOptions}
              disabled={pinSymbol}
              placeholder={pinSymbol ? '— symbol —' : '— none —'}
              onChange={(k) => pick(key, k ?? undefined)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Combobox picking one column key out of potentially many. */
function ColumnSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = '— pick a column —',
  hideLabel = false,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (key: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  hideLabel?: boolean;
}) {
  return (
    <div>
      {!hideLabel && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
          {label}
        </span>
      )}
      <Combobox
        items={options}
        value={value}
        onValueChange={(v) => onChange(v ?? null)}
        disabled={disabled}
      >
        <ComboboxInput
          aria-label={label}
          placeholder={placeholder}
          showClear={!!value}
          disabled={disabled}
          className="mt-1 w-full"
        />
        <ComboboxContent>
          <ComboboxEmpty className="px-2 text-xs">
            No matching columns.
          </ComboboxEmpty>
          <ComboboxList>
            {options.map((k) => (
              <ComboboxItem key={k} value={k}>
                <span className="truncate font-mono text-xs">{k}</span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
