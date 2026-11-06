import { describe, expect, it } from 'vitest';
import { findArrays, flattenJson, getByPath } from './jsonPaths';

/** Alpha Vantage GLOBAL_QUOTE shape — keys contain dots. */
const AV_QUOTE = {
  'Global Quote': {
    '01. symbol': 'AAPL',
    '05. price': '178.21',
    '10. change percent': '1.23%',
  },
};

/* ------------------------------------------------------------------ */
/* getByPath                                                            */
/* ------------------------------------------------------------------ */

describe('getByPath', () => {
  it('reads nested dot paths', () => {
    expect(getByPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('reads array indices via brackets and dots', () => {
    const obj = { items: [{ v: 1 }, { v: 2 }] };
    expect(getByPath(obj, 'items[1].v')).toBe(2);
    expect(getByPath(obj, 'items.0.v')).toBe(1);
  });

  it('reads root array indices', () => {
    expect(getByPath([{ v: 7 }], '[0].v')).toBe(7);
  });

  it('reads quoted bracket keys containing dots', () => {
    expect(getByPath(AV_QUOTE, 'Global Quote["05. price"]')).toBe('178.21');
    expect(getByPath(AV_QUOTE, "Global Quote['10. change percent']")).toBe('1.23%');
  });

  it('resolves ambiguous hand-written dotted keys greedily', () => {
    expect(getByPath(AV_QUOTE, 'Global Quote.05. price')).toBe('178.21');
  });

  it('handles keys with spaces as dot segments', () => {
    expect(getByPath(AV_QUOTE, 'Global Quote["01. symbol"]')).toBe('AAPL');
  });

  it('returns undefined for missing or unreachable paths', () => {
    expect(getByPath({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(getByPath({ a: 1 }, 'x.y')).toBeUndefined();
    expect(getByPath(null, 'a')).toBeUndefined();
    expect(getByPath({ a: [1] }, 'a[5]')).toBeUndefined();
  });

  it('returns root for an empty path', () => {
    const obj = { a: 1 };
    expect(getByPath(obj, '')).toBe(obj);
  });
});

/* ------------------------------------------------------------------ */
/* flattenJson                                                          */
/* ------------------------------------------------------------------ */

describe('flattenJson', () => {
  it('flattens nested objects into leaf paths', () => {
    expect(flattenJson({ data: { rates: { INR: 83.1, USD: 1 } } })).toEqual([
      { path: 'data.rates.INR', type: 'number', sample: '83.1' },
      { path: 'data.rates.USD', type: 'number', sample: '1' },
    ]);
  });

  it('indexes into arrays', () => {
    const flat = flattenJson({ items: [{ v: 1 }, { v: 2 }] });
    expect(flat.map((f) => f.path)).toEqual(['items[0].v', 'items[1].v']);
  });

  it('emits bracket notation for keys containing dots, and round-trips', () => {
    const flat = flattenJson(AV_QUOTE);
    const price = flat.find((f) => f.sample === '178.21');
    expect(price?.path).toBe('Global Quote["05. price"]');
    for (const f of flat) {
      expect(getByPath(AV_QUOTE, f.path)).not.toBeUndefined();
    }
  });

  it('detects date, string, boolean and null leaves', () => {
    const flat = flattenJson({ d: '2024-01-05', s: 'hello', b: true, n: null });
    expect(flat).toContainEqual({ path: 'd', type: 'date', sample: '2024-01-05' });
    expect(flat).toContainEqual({ path: 's', type: 'string', sample: 'hello' });
    expect(flat).toContainEqual({ path: 'b', type: 'boolean', sample: 'true' });
    expect(flat).toContainEqual({ path: 'n', type: 'null', sample: 'null' });
  });

  it('does not mistake a plain year string for a date', () => {
    expect(flattenJson({ y: '20241' })[0].type).toBe('string');
  });

  it('represents empty containers as leaves', () => {
    const flat = flattenJson({ o: {}, a: [] });
    expect(flat).toContainEqual({ path: 'o', type: 'object', sample: '{}' });
    expect(flat).toContainEqual({ path: 'a', type: 'array', sample: '[]' });
  });

  it('respects the leaf cap', () => {
    const big = { a: 1, b: 2, c: 3 };
    expect(flattenJson(big, 2)).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* findArrays                                                           */
/* ------------------------------------------------------------------ */

describe('findArrays', () => {
  it('finds arrays of objects with count and first-item keys', () => {
    const res = findArrays({
      users: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    });
    expect(res).toEqual([
      { path: 'users', kind: 'array', count: 2, keys: ['id', 'name'] },
    ]);
  });

  it('finds nested arrays', () => {
    const res = findArrays({ outer: { inner: [{ a: 1 }] } });
    expect(res[0]).toMatchObject({ path: 'outer.inner', kind: 'array', count: 1 });
  });

  it('skips arrays of primitives and empty arrays', () => {
    expect(findArrays({ tags: ['x', 'y'], empty: [] })).toEqual([]);
  });

  it('exposes date-keyed objects as dateMap rows', () => {
    const res = findArrays({
      'Meta Data': { symbol: 'AAPL' },
      'Time Series (Daily)': {
        '2024-01-05': { '1. open': '1', '4. close': '2' },
        '2024-01-04': { '1. open': '3', '4. close': '4' },
      },
    });
    expect(res).toEqual([
      {
        path: 'Time Series (Daily)',
        kind: 'dateMap',
        count: 2,
        keys: ['date', '1. open', '4. close'],
      },
    ]);
  });

  it('does not flag objects with mixed or non-date keys', () => {
    const mixed = { '2024-01-05': { a: 1 }, note: 'x' };
    expect(findArrays({ meta: mixed })).toEqual([]);
  });

  it('skips date-keyed maps whose values are scalars', () => {
    const scalarMap = { '2024-01-05': 42, '2024-01-04': 43 };
    expect(findArrays({ s: scalarMap })).toEqual([]);
  });
});
