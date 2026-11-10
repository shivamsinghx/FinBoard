import { describe, expect, it } from 'vitest';
import {
  cellMatchesQuery,
  passesRange,
  rangeIsActive,
  rowMatchesQuery,
  smartCompare,
} from './tableModel';

describe('smartCompare', () => {
  it('sorts numbers numerically', () => {
    expect([10, 2, 30].sort(smartCompare)).toEqual([2, 10, 30]);
  });

  it('sorts numeric strings as numbers, not lexically', () => {
    expect(['30', '4', '100'].sort(smartCompare)).toEqual(['4', '30', '100']);
    // thousand separators / decimals / percents count as numbers
    expect(smartCompare('1,234', '99')).toBeGreaterThan(0);
    expect(smartCompare('2.5%', '10.1%')).toBeLessThan(0);
  });

  it('sorts date-shaped strings chronologically', () => {
    expect(
      ['2024-03-01', '2023-12-31', '2024-01-15'].sort(smartCompare),
    ).toEqual(['2023-12-31', '2024-01-15', '2024-03-01']);
    expect(smartCompare('2024-01-01', '2024-01-02')).toBeLessThan(0);
  });

  it('sinks nulls/undefined to the end regardless of direction use', () => {
    expect([null, 'b', 'a'].sort(smartCompare)).toEqual(['a', 'b', null]);
    expect(smartCompare(undefined, undefined)).toBe(0);
  });

  it('falls back to a numeric-aware string compare for text', () => {
    expect(['item10', 'item2', 'item1'].sort(smartCompare)).toEqual([
      'item1',
      'item2',
      'item10',
    ]);
  });
});

describe('cellMatchesQuery', () => {
  it('matches case-insensitively on the display value', () => {
    expect(cellMatchesQuery('Apple Inc', 'apple')).toBe(true);
    expect(cellMatchesQuery(178.5, '78.5')).toBe(true);
    expect(cellMatchesQuery('TSLA', 'zz')).toBe(false);
    expect(cellMatchesQuery(null, 'a')).toBe(false);
    expect(cellMatchesQuery(undefined, '')).toBe(false);
  });
});

describe('rowMatchesQuery', () => {
  const row = { ticker: 'AAPL', price: '178.5', name: 'Apple Inc' };

  it('matches when any scanned key contains the query', () => {
    expect(rowMatchesQuery(row, ['ticker', 'name'], 'apple')).toBe(true);
    expect(rowMatchesQuery(row, ['ticker', 'price'], '178')).toBe(true);
    expect(rowMatchesQuery(row, ['ticker'], 'apple')).toBe(false);
  });

  it('empty query passes everything', () => {
    expect(rowMatchesQuery(row, ['ticker'], '  ')).toBe(true);
  });
});

describe('passesRange', () => {
  it('honours closed bounds on numeric values', () => {
    expect(passesRange('150', '100', '200')).toBe(true);
    expect(passesRange('250', '100', '200')).toBe(false);
    expect(passesRange('100', '100', '100')).toBe(true);
  });

  it('open ends are unbounded', () => {
    expect(passesRange('5000', '', '200')).toBe(false);
    expect(passesRange('50', '100', '')).toBe(false);
    expect(passesRange('50', '', '')).toBe(true);
  });

  it('numeric strings count as numbers', () => {
    expect(passesRange('1,250', '1000', '2000')).toBe(true);
    expect(passesRange('-3.5', '-5', '-1')).toBe(true);
  });

  it('rejects non-numeric cells once a bound is set', () => {
    expect(passesRange('AAPL', '1', '10')).toBe(false);
    expect(passesRange(null, '1', '10')).toBe(false);
  });

  it('treats a mid-edit (unparseable) bound as unbounded', () => {
    expect(passesRange('50', '-', 'x')).toBe(true);
    expect(passesRange('50', '-', '20')).toBe(false);
  });
});

describe('rangeIsActive', () => {
  it('is true only when a bound is filled', () => {
    expect(rangeIsActive({ min: '1', max: '' })).toBe(true);
    expect(rangeIsActive({ min: '', max: '5' })).toBe(true);
    expect(rangeIsActive({ min: ' ', max: '' })).toBe(false);
    expect(rangeIsActive(undefined)).toBe(false);
  });
});
