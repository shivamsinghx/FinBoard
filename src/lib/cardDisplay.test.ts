import { describe, expect, it } from 'vitest';
import {
  guessListColumns,
  looksLikeChange,
  suggestPerformanceFields,
  urlWithSymbol,
} from './cardDisplay';
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
  it('prefers the percentage change over the absolute change (AV gainers shape)', () => {
    expect(
      guessListColumns([
        'ticker',
        'price',
        'change_amount',
        'change_percentage',
        'volume',
      ]),
    ).toEqual({
      name: 'ticker',
      price: 'price',
      change: 'change_percentage',
    });
  });
  it('handles a Finnhub quote payload (no name column)', () => {
    expect(guessListColumns(['c', 'd', 'dp', 'h', 'l', 'o', 'pc', 't'])).toEqual({
      price: 'c',
      change: 'dp',
    });
  });
  it('omits roles nothing matched', () => {
    expect(guessListColumns(['a', 'b'])).toEqual({});
  });
});

describe('suggestPerformanceFields', () => {
  it('ranks 52-week range and beta above generic numbers', () => {
    const leaves = [
      'metric.10DayAverageTradingVolume',
      'metric.52WeekHigh',
      'metric.beta',
      'metric.peBasicExclExtraTTM',
      'metric.52WeekLow',
      'metric.3MonthAverageTradingVolume',
    ].map((path) => ({ path }));
    const top = suggestPerformanceFields(leaves);
    expect(top[0]).toBe('metric.52WeekHigh');
    expect(top.slice(0, 2)).toContain('metric.52WeekLow');
    expect(top).toContain('metric.beta');
    expect(top).toContain('metric.peBasicExclExtraTTM');
  });
  it('returns nothing for unrelated fields', () => {
    expect(
      suggestPerformanceFields([{ path: 's' }, { path: 'data.rates.INR' }]),
    ).toEqual([]);
  });
});

describe('urlWithSymbol', () => {
  it('replaces a symbol param', () => {
    expect(urlWithSymbol('https://finnhub.io/api/v1/quote?symbol=AAPL', 'MSFT')).toBe(
      'https://finnhub.io/api/v1/quote?symbol=MSFT',
    );
  });
  it('keeps other params untouched', () => {
    expect(
      urlWithSymbol(
        'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo',
        'TSLA',
      ),
    ).toBe(
      'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=TSLA&apikey=demo',
    );
  });
  it('appends symbol when no such param exists', () => {
    expect(urlWithSymbol('https://api.x.com/quote?currency=BTC', 'ETH')).toBe(
      'https://api.x.com/quote?currency=BTC&symbol=ETH',
    );
  });
  it('passes through unparseable input', () => {
    expect(urlWithSymbol('not a url', 'AAPL')).toBe('not a url');
  });
});
