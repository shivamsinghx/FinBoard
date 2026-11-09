import { describe, expect, it } from 'vitest';
import { guessListColumns, looksLikeChange } from './cardDisplay';
import type { FieldMapping } from '@/types/widget';

const f = (path: string, label = path, format: FieldMapping['format'] = 'auto'): FieldMapping => ({
  path,
  label,
  format,
});

describe('looksLikeChange', () => {
  it('flags percent-formatted fields', () => {
    expect(looksLikeChange(f('c', 'Price', 'percent'))).toBe(true);
  });
  it('flags change-ish labels and paths', () => {
    expect(looksLikeChange(f('dp', 'dp'))).toBe(true);
    expect(looksLikeChange(f('pc', 'pc'))).toBe(true);
    expect(looksLikeChange(f('x', 'Change %'))).toBe(true);
    expect(looksLikeChange(f('a.b.changePercent', 'x'))).toBe(true);
  });
  it('leaves plain price fields alone', () => {
    expect(looksLikeChange(f('c', 'Price'))).toBe(false);
    expect(looksLikeChange(f('Global Quote["05. price"]', 'Price'))).toBe(false);
  });
});

describe('guessListColumns', () => {
  it('finds name/price/change in a quote-shaped row', () => {
    expect(guessListColumns(['symbol', 'price', 'changePercent'])).toEqual({
      name: 'symbol',
      price: 'price',
      change: 'changePercent',
    });
  });
  it('finds short-name columns', () => {
    expect(guessListColumns(['ticker', 'c', 'dp'])).toEqual({
      name: 'ticker',
      price: 'c',
      change: 'dp',
    });
  });
  it('loose-matches verbose column names', () => {
    expect(guessListColumns(['companyName', 'lastPrice', 'percentChange'])).toEqual({
      name: 'companyName',
      price: 'lastPrice',
      change: 'percentChange',
    });
  });
  it('omits roles nothing matched', () => {
    expect(guessListColumns(['a', 'b'])).toEqual({});
  });
});
