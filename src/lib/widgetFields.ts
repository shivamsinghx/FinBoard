/**
 * Helpers for the add-widget field picker.
 *
 * - `rowsForList` materializes a picked `ArrayInfo` (real array or
 *   date-keyed map) into plain row objects.
 * - `columnsForRows` dedupes row keys into column descriptors — one
 *   entry per column, never `items[0].price`, `items[1].price`, …
 * - `guessOhlcFields` auto-maps candle columns from key names
 *   (`o`/`h`/`l`/`c`, `open`, `"1. open"`, …).
 * - `lastPathSegment` + `prettifyKey` turn paths into field labels.
 */

import {
  getByPath,
  leafType,
  sampleOf,
  type ArrayInfo,
  type LeafType,
} from './jsonPaths';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/* ------------------------------------------------------------------ */
/* Rows + columns                                                       */
/* ------------------------------------------------------------------ */

/**
 * Materialize a list picked via `findArrays` into rows:
 * - `kind: 'array'` → the object elements themselves
 * - `kind: 'dateMap'` → `{ date, ...values }` per entry
 */
export function rowsForList(
  data: unknown,
  list: ArrayInfo,
): Record<string, unknown>[] {
  const node = getByPath(data, list.path);
  if (list.kind === 'array') {
    return Array.isArray(node) ? node.filter(isRecord) : [];
  }
  if (!isRecord(node)) return [];
  return Object.entries(node)
    .filter(([, v]) => isRecord(v))
    .map(([date, v]) => ({ date, ...(v as Record<string, unknown>) }));
}

export interface ColumnInfo {
  /** Row key — usable as a `FieldMapping.path` against each row. */
  key: string;
  /** Number of rows containing the key. */
  count: number;
  type: LeafType;
  sample: string;
}

/**
 * Union of keys across `rows`, in first-seen order, one entry each —
 * the deduped column list shown by the table/chart field picker.
 */
export function columnsForRows(rows: Record<string, unknown>[]): ColumnInfo[] {
  const cols = new Map<string, ColumnInfo>();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const col = cols.get(key);
      if (col) {
        col.count++;
        continue;
      }
      cols.set(key, { key, count: 1, type: leafType(value), sample: sampleOf(value) });
    }
  }
  return [...cols.values()];
}

/* ------------------------------------------------------------------ */
/* OHLC auto-guess                                                      */
/* ------------------------------------------------------------------ */

export type OhlcField = 'date' | 'open' | 'high' | 'low' | 'close' | 'volume';

/** Column key guessed for each role (fields absent when nothing matched). */
export type OhlcGuess = Partial<Record<OhlcField, string>>;

/** "1. open" / "05_price" → "open"; "openPrice" → "openprice". */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/^\d+[\s._-]*/, '') // Alpha Vantage's numbered prefixes
    .replace(/[^a-z0-9]/g, '');
}

const EXACT: readonly [OhlcField, RegExp][] = [
  ['date', /^(date|day|time|timestamp|datetime|dt|t|x)$/],
  ['open', /^(o|open|openprice|opening|first)$/],
  ['high', /^(h|high|highprice|max)$/],
  ['low', /^(l|low|lowprice|min)$/],
  ['close', /^(c|close|closeprice|last|lastprice|adjclose|adjustedclose)$/],
  ['volume', /^(v|vol|volume)$/],
];

/** Looser fallback pass — only applied to roles still unclaimed. */
const LOOSE: readonly [OhlcField, RegExp][] = [
  ['date', /date|time|day$/],
  ['open', /open|first/],
  ['high', /high|max/],
  ['low', /low|min/],
  ['close', /close|last$/],
  ['volume', /vol|volume|qty|shares/],
];

/**
 * Guess which columns hold OHLC(+date/volume) values. Two passes —
 * exact names first, then substring matches — so `c` wins over a
 * weaker `close`-containing key when both exist. Returns the original
 * key names so they can read `row[key]` directly.
 */
export function guessOhlcFields(keys: string[]): OhlcGuess {
  const guess: OhlcGuess = {};
  const norm = keys.map((key) => ({ key, n: normalizeKey(key) }));
  for (const pass of [EXACT, LOOSE]) {
    for (const { key, n } of norm) {
      if (!n) continue;
      for (const [role, re] of pass) {
        if (guess[role] === undefined && re.test(n)) guess[role] = key;
      }
    }
  }
  return guess;
}

/* ------------------------------------------------------------------ */
/* Labels                                                               */
/* ------------------------------------------------------------------ */

/** Last addressable segment: 'a.b.c'→'c', 'a["b.c"]'→'b.c', 'a[0]'→'0'. */
export function lastPathSegment(path: string): string {
  const bracket = path.match(/\[["']?((?:\\.|[^\]"'])*)["']?\]\s*$/);
  if (bracket) return bracket[1].replace(/\\(.)/g, '$1');
  const i = path.lastIndexOf('.');
  return i === -1 ? path : path.slice(i + 1);
}

/**
 * Human label for a key/segment: '01. symbol'→'Symbol',
 * 'changePercent'→'Change Percent', 'c'→'C', 'INR'→'INR'.
 * All-caps words are treated as acronyms and kept as-is.
 */
export function prettifyKey(key: string): string {
  const s = key
    .replace(/^\d+[\s._-]*/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim();
  if (!s) return key;
  return s
    .split(/\s+/)
    .map((w) => (w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
