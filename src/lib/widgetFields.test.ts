import { describe, expect, it } from 'vitest';
import {
  columnsForRows,
  guessOhlcFields,
  lastPathSegment,
  prettifyKey,
  rowsForList,
} from './widgetFields';
import type { ArrayInfo } from './jsonPaths';

/* ------------------------------------------------------------------ */
/* rowsForList                                                          */
/* ------------------------------------------------------------------ */

describe('rowsForList', () => {
  it('returns object rows for array lists', () => {
    const data = { users: [{ id: 1 }, { id: 2 }, 'junk', { id: 3 }] };
    const list: ArrayInfo = { path: 'users', kind: 'array', count: 4, keys: ['id'] };
    expect(rowsForList(data, list)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('expands date-keyed maps into { date, ...values } rows', () => {
    const data = {
      'Time Series (Daily)': {
        '2024-01-05': { open: 1, close: 2 },
        '2024-01-04': { open: 3, close: 4 },
      },
    };
    const list: ArrayInfo = {
      path: 'Time Series (Daily)',
      kind: 'dateMap',
      count: 2,
      keys: ['date', 'open', 'close'],
    };
    expect(rowsForList(data, list)).toEqual([
      { date: '2024-01-05', open: 1, close: 2 },
      { date: '2024-01-04', open: 3, close: 4 },
    ]);
  });

  it('returns [] when the path is missing or not a container', () => {
    const list: ArrayInfo = { path: 'nope', kind: 'array', count: 0, keys: [] };
    expect(rowsForList({}, list)).toEqual([]);
    expect(rowsForList({ nope: 42 }, list)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* columnsForRows — the dedupe                                          */
/* ------------------------------------------------------------------ */

describe('columnsForRows', () => {
  it('dedupes keys across rows in first-seen order', () => {
    const cols = columnsForRows([
      { price: 1, company: 'a' },
      { price: 2, company: 'b' },
      { price: 3, company: 'c' },
    ]);
    expect(cols.map((c) => c.key)).toEqual(['price', 'company']);
    expect(cols[0].count).toBe(3);
  });

  it('unions keys that appear in only some rows', () => {
    const cols = columnsForRows([
      { a: 1 },
      { b: 2 },
      { a: 3, c: 4 },
    ]);
    expect(cols.map((c) => c.key)).toEqual(['a', 'b', 'c']);
    expect(cols.find((c) => c.key === 'a')?.count).toBe(2);
    expect(cols.find((c) => c.key === 'b')?.count).toBe(1);
  });

  it('keeps type and sample from the first occurrence', () => {
    const cols = columnsForRows([{ p: '1.23' }, { p: '4.56' }]);
    expect(cols[0]).toMatchObject({ key: 'p', type: 'string', sample: '1.23' });
  });

  it('returns [] for no rows', () => {
    expect(columnsForRows([])).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* guessOhlcFields — auto-guess                                         */
/* ------------------------------------------------------------------ */

describe('guessOhlcFields', () => {
  it('maps Alpha Vantage numbered keys', () => {
    expect(
      guessOhlcFields(['1. open', '2. high', '3. low', '4. close', '5. volume']),
    ).toEqual({
      open: '1. open',
      high: '2. high',
      low: '3. low',
      close: '4. close',
      volume: '5. volume',
    });
  });

  it('maps Finnhub single-letter keys plus t/v', () => {
    expect(guessOhlcFields(['s', 'o', 'h', 'l', 'c', 't', 'v'])).toEqual({
      date: 't',
      open: 'o',
      high: 'h',
      low: 'l',
      close: 'c',
      volume: 'v',
    });
  });

  it('maps verbose names and a date column', () => {
    expect(guessOhlcFields(['date', 'open', 'high', 'low', 'close'])).toEqual({
      date: 'date',
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    });
  });

  it('uses loose matching for names like openPrice / adjClose', () => {
    expect(
      guessOhlcFields(['timestamp', 'openPrice', 'highPrice', 'lowPrice', 'adjClose']),
    ).toEqual({
      date: 'timestamp',
      open: 'openPrice',
      high: 'highPrice',
      low: 'lowPrice',
      close: 'adjClose',
    });
  });

  it('omits roles nothing matched and avoids false positives', () => {
    // 'pc' (previous close) and 'changePercent' must not be claimed.
    expect(guessOhlcFields(['pc', 'changePercent', 'company'])).toEqual({});
  });
});

/* ------------------------------------------------------------------ */
/* labels                                                               */
/* ------------------------------------------------------------------ */

describe('lastPathSegment', () => {
  it('takes the last dot segment', () => {
    expect(lastPathSegment('a.b.c')).toBe('c');
    expect(lastPathSegment('items[0].price')).toBe('price');
  });
  it('unquotes a trailing bracket key', () => {
    expect(lastPathSegment('Global Quote["05. price"]')).toBe('05. price');
  });
  it('returns the whole path when it is one segment', () => {
    expect(lastPathSegment('price')).toBe('price');
  });
});

describe('prettifyKey', () => {
  it('strips numeric prefixes and title-cases', () => {
    expect(prettifyKey('01. symbol')).toBe('Symbol');
    expect(prettifyKey('4. close')).toBe('Close');
  });
  it('splits camelCase', () => {
    expect(prettifyKey('changePercent')).toBe('Change Percent');
  });
  it('splits separators', () => {
    expect(prettifyKey('previous_close')).toBe('Previous Close');
  });
  it('keeps acronyms and single letters', () => {
    expect(prettifyKey('INR')).toBe('INR');
    expect(prettifyKey('c')).toBe('C');
  });
});
