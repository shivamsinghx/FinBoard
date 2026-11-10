import { toNumber } from './formatters';

/**
 * Pure helpers backing the table widget — sorting, global search and
 * numeric range filters. Kept framework-free so they stay unit-testable.
 */

/** Loose date check — keeps "2024-01-15" sortable without eating words. */
const DATEISH =
  /^\d{4}[-/]\d{1,2}[-/]\d{1,2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/;

function toTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || !DATEISH.test(value.trim())) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Three-way comparator for column sorting: numeric strings sort as
 * numbers ("1,234" > "99"), date-shaped strings sort as dates, nulls
 * always sink to the end, everything else falls back to a
 * numeric-aware localeCompare (so mixed content still reads sanely).
 */
export function smartCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an - bn;

  const ad = toTime(a);
  const bd = toTime(b);
  if (ad !== null && bd !== null) return ad - bd;

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/** Case-insensitive substring match for one cell's display value. */
export function cellMatchesQuery(value: unknown, query: string): boolean {
  if (value == null) return false;
  return String(value).toLowerCase().includes(query.toLowerCase());
}

/**
 * Row-level match for the global search — true when any of the given
 * column keys contains the query (search only scans visible columns).
 */
export function rowMatchesQuery(
  row: Record<string, unknown>,
  keys: string[],
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return true;
  return keys.some((k) => cellMatchesQuery(row[k], q));
}

export interface RangeFilter {
  min: string;
  max: string;
}

/** True when either bound is filled in — empty ranges filter nothing. */
export function rangeIsActive(range: RangeFilter | undefined): boolean {
  return !!range && (range.min.trim() !== '' || range.max.trim() !== '');
}

/**
 * Numeric range predicate for a cell. Non-numeric cells fail once a
 * bound is set; an open end is unbounded. Unparseable bound input is
 * treated as no bound (the input is mid-edit).
 */
export function passesRange(
  value: unknown,
  min: string,
  max: string,
): boolean {
  const n = toNumber(value);
  if (n === null) return false;
  const lon = Number(min);
  const hin = Number(max);
  const lo = min.trim() !== '' && !Number.isNaN(lon) ? lon : -Infinity;
  const hi = max.trim() !== '' && !Number.isNaN(hin) ? hin : Infinity;
  return n >= lo && n <= hi;
}
