import { toNumber } from './formatters';

/**
 * Pure helpers backing the chart widget — pull dated points/candles out
 * of list rows and resample them to daily/weekly/monthly buckets.
 * Framework-free so the whole pipeline stays unit-testable.
 */

export type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export interface SeriesPoint {
  /** Epoch ms for date-like x values; null when x isn't a time. */
  t: number | null;
  /** Raw x value — formatted at render time. */
  x: unknown;
  /** Row order — keeps non-dated series deterministic. */
  i: number;
  values: Record<string, number | null>;
}

export interface Candle {
  t: number | null;
  x: unknown;
  i: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Best-effort timestamp for an x-axis value: Date objects pass through,
 * date-ish strings go through Date.parse, and plain numbers are read as
 * epoch seconds (≥2001) or epoch ms — anything else isn't a time.
 */
export function toChartTime(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 1e12) return value; // epoch ms
    if (value >= 1e9) return value * 1000; // epoch s
    return null;
  }
  if (typeof value === 'string') {
    const t = Date.parse(value.trim());
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Rows → dated-or-indexed line/area points for the given value keys. */
export function buildSeries(
  rows: Record<string, unknown>[],
  xKey: string,
  valueKeys: string[],
): SeriesPoint[] {
  return rows.map((row, i) => ({
    t: toChartTime(row[xKey]),
    x: row[xKey],
    i,
    values: Object.fromEntries(
      valueKeys.map((k) => [k, toNumber(row[k])]),
    ),
  }));
}

/** Rows → OHLC candles; rows missing any leg are dropped. */
export function buildCandles(
  rows: Record<string, unknown>[],
  xKey: string,
  ohlc: Partial<Record<'open' | 'high' | 'low' | 'close', string>>,
): Candle[] {
  const out: Candle[] = [];
  rows.forEach((row, i) => {
    const o = toNumber(ohlc.open ? row[ohlc.open] : null);
    const h = toNumber(ohlc.high ? row[ohlc.high] : null);
    const l = toNumber(ohlc.low ? row[ohlc.low] : null);
    const c = toNumber(ohlc.close ? row[ohlc.close] : null);
    if (o === null || h === null || l === null || c === null) return;
    out.push({ t: toChartTime(row[xKey]), x: row[xKey], i, open: o, high: h, low: l, close: c });
  });
  return out;
}

/** Ascending by time; undated points keep row order and sit at the end. */
export function sortByTime<T extends { t: number | null; i: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    if (a.t === null && b.t === null) return a.i - b.i;
    if (a.t === null) return 1;
    if (b.t === null) return -1;
    return a.t - b.t;
  });
}

/* ------------------------------------------------------------------ */
/* Resampling                                                          */
/* ------------------------------------------------------------------ */

/** ISO-8601 week key (Mon-start), e.g. "2020-W53" for 2021-01-01. */
function weekKey(t: number): string {
  const d = new Date(t);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay() || 7; // Sun 0 → 7
  day.setUTCDate(day.getUTCDate() + 4 - dow); // → Thursday of this ISO week
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.floor((day.getTime() - yearStart) / 604800000) + 1;
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Calendar bucket key for a timestamp under the given period. */
export function periodKey(t: number, period: ChartPeriod): string {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  if (period === 'monthly') return `${y}-${m}`;
  if (period === 'weekly') return weekKey(t);
  return `${y}-${m}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Line/area resample — one point per calendar bucket, taking the LAST
 * point's values (a period's close). Untimed series pass through
 * untouched: without timestamps there is nothing to bucket on.
 */
export function resamplePoints(
  points: SeriesPoint[],
  period: ChartPeriod,
): SeriesPoint[] {
  if (points.some((p) => p.t === null)) return points;
  const out: SeriesPoint[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && periodKey(last.t!, period) === periodKey(p.t!, period)) {
      out[out.length - 1] = p;
    } else {
      out.push(p);
    }
  }
  return out;
}

/**
 * Candle resample — one candle per calendar bucket: first open, max
 * high, min low, last close, labelled by the period's opening date.
 * Untimed candles pass through untouched.
 */
export function resampleCandles(
  candles: Candle[],
  period: ChartPeriod,
): Candle[] {
  if (candles.some((c) => c.t === null)) return candles;
  const out: Candle[] = [];
  for (const c of candles) {
    const last = out[out.length - 1];
    if (last && periodKey(last.t!, period) === periodKey(c.t!, period)) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
    } else {
      out.push({ ...c });
    }
  }
  return out;
}
