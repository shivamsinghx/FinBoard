import { describe, expect, it } from 'vitest';
import {
  buildCandles,
  buildSeries,
  periodKey,
  resampleCandles,
  resamplePoints,
  sortByTime,
  toChartTime,
  type Candle,
  type SeriesPoint,
} from './chartSeries';

const mkPoint = (t: number | null, v: number): SeriesPoint => ({
  t,
  x: t === null ? 'n/a' : new Date(t).toISOString().slice(0, 10),
  i: 0,
  values: { close: v },
});

const d = (s: string) => Date.parse(s + 'T00:00:00Z');

describe('toChartTime', () => {
  it('parses date strings, epochs, and rejects non-times', () => {
    expect(toChartTime('2024-01-15')).toBe(d('2024-01-15'));
    expect(toChartTime('2024-01-15 14:30:00')).not.toBeNull();
    expect(toChartTime(1700000000)).toBe(1700000000000); // s → ms
    expect(toChartTime(1700000000000)).toBe(1700000000000); // ms
    expect(toChartTime(42)).toBeNull();
    expect(toChartTime('AAPL')).toBeNull();
    expect(toChartTime(null)).toBeNull();
  });
});

describe('buildSeries / buildCandles', () => {
  it('extracts numeric values by key', () => {
    const [p] = buildSeries(
      [{ date: '2024-01-15', '4. close': '150.25' }],
      'date',
      ['4. close'],
    );
    expect(p.t).toBe(d('2024-01-15'));
    expect(p.values['4. close']).toBe(150.25);
  });

  it('drops candle rows missing a leg', () => {
    const rows = [
      { date: '2024-01-15', o: '1', h: '2', l: '0.5', c: '1.5' },
      { date: '2024-01-16', o: '1', h: '2', l: '', c: '1.5' },
    ];
    const cs = buildCandles(rows, 'date', {
      open: 'o',
      high: 'h',
      low: 'l',
      close: 'c',
    });
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ open: 1, high: 2, low: 0.5, close: 1.5 });
  });
});

describe('sortByTime', () => {
  it('orders ascending by time, undated last in row order', () => {
    const pts = [
      mkPoint(d('2024-01-17'), 3),
      mkPoint(null, 9),
      mkPoint(d('2024-01-15'), 1),
      mkPoint(d('2024-01-16'), 2),
    ];
    const vals = sortByTime(pts).map((p) => p.values.close);
    expect(vals).toEqual([1, 2, 3, 9]);
  });
});

describe('periodKey', () => {
  it('builds daily/monthly calendar keys', () => {
    expect(periodKey(d('2024-03-15'), 'daily')).toBe('2024-03-15');
    expect(periodKey(d('2024-03-15'), 'monthly')).toBe('2024-03');
  });

  it('builds ISO week keys across year boundaries', () => {
    // Jan 1 2021 is still ISO week 53 of 2020
    expect(periodKey(d('2021-01-01'), 'weekly')).toBe('2020-W53');
    expect(periodKey(d('2021-01-04'), 'weekly')).toBe('2021-W01'); // Monday
    expect(periodKey(d('2024-03-15'), 'weekly')).toBe('2024-W11');
  });
});

describe('resamplePoints', () => {
  it('keeps the last close per month', () => {
    const pts = sortByTime([
      mkPoint(d('2024-01-02'), 100),
      mkPoint(d('2024-01-15'), 110),
      mkPoint(d('2024-01-30'), 105),
      mkPoint(d('2024-02-05'), 120),
    ]);
    const out = resamplePoints(pts, 'monthly');
    expect(out).toHaveLength(2);
    expect(out[0].values.close).toBe(105); // last of January
    expect(out[1].values.close).toBe(120);
  });

  it('daily pass-through on already-daily data, aggregates intraday', () => {
    const daily = [mkPoint(d('2024-01-15'), 1), mkPoint(d('2024-01-16'), 2)];
    expect(resamplePoints(daily, 'daily')).toHaveLength(2);
    const intraday = [
      mkPoint(d('2024-01-15') + 3600e3, 1),
      mkPoint(d('2024-01-15') + 7200e3, 2),
    ];
    expect(resamplePoints(intraday, 'daily')).toHaveLength(1);
  });

  it('passes undated series through untouched', () => {
    const pts = [mkPoint(null, 1), mkPoint(null, 2)];
    expect(resamplePoints(pts, 'weekly')).toBe(pts);
  });
});

describe('resampleCandles', () => {
  const mkCandle = (
    t: number,
    o: number,
    h: number,
    l: number,
    c: number,
  ): Candle => ({ t, x: new Date(t).toISOString().slice(0, 10), i: 0, open: o, high: h, low: l, close: c });

  it('aggregates OHLC per week', () => {
    const cs = sortByTime([
      mkCandle(d('2024-03-04'), 10, 12, 9, 11), // Mon W10
      mkCandle(d('2024-03-06'), 11, 15, 10, 14), // Wed W10
      mkCandle(d('2024-03-08'), 14, 16, 13, 15), // Fri W10
      mkCandle(d('2024-03-11'), 15, 18, 14, 17), // Mon W11
    ]);
    const out = resampleCandles(cs, 'weekly');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ open: 10, high: 16, low: 9, close: 15 });
    expect(out[1]).toMatchObject({ open: 15, high: 18, low: 14, close: 17 });
    expect(out[0].x).toBe('2024-03-04'); // labelled by period open
  });

  it('does not mutate the input', () => {
    const cs = sortByTime([
      mkCandle(d('2024-03-04'), 10, 12, 9, 11),
      mkCandle(d('2024-03-06'), 11, 15, 10, 14),
    ]);
    resampleCandles(cs, 'weekly');
    expect(cs[0].high).toBe(12);
    expect(cs[0].close).toBe(11);
  });

  it('passes undated candles through untouched', () => {
    const cs: Candle[] = [
      { t: null, x: 'n/a', i: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
    ];
    expect(resampleCandles(cs, 'monthly')).toBe(cs);
  });
});
