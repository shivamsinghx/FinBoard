import { describe, expect, it } from 'vitest';
import { EMPTY_VALUE, formatValue } from './formatters';

describe('formatValue — auto', () => {
  it('formats numbers with grouping', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(1234.5)).toBe('1,234.5');
  });

  it('compacts large numbers', () => {
    expect(formatValue(1_500_000)).toBe('1.5M');
    expect(formatValue(2_340_000_000)).toBe('2.34B');
  });

  it('formats strings containing numbers', () => {
    expect(formatValue('2,500.75')).toBe('2,500.75');
    expect(formatValue('$1,234.50')).toBe('1,234.5');
    expect(formatValue('-3.5')).toBe('-3.5');
  });

  it('formats date-shaped strings as dates', () => {
    expect(formatValue('2024-01-05')).toBe('Jan 5, 2024');
  });

  it('passes plain strings through', () => {
    expect(formatValue('AAPL')).toBe('AAPL');
    expect(formatValue('N/A')).toBe('N/A');
  });

  it('handles null, undefined and booleans', () => {
    expect(formatValue(null)).toBe(EMPTY_VALUE);
    expect(formatValue(undefined)).toBe(EMPTY_VALUE);
    expect(formatValue(true)).toBe('Yes');
    expect(formatValue(false)).toBe('No');
  });
});

describe('formatValue — number', () => {
  it('groups and rounds to 2 decimals', () => {
    expect(formatValue(1234.567, 'number')).toBe('1,234.57');
    expect(formatValue('1234.567', 'number')).toBe('1,234.57');
  });

  it('uses significant digits for sub-unit values', () => {
    expect(formatValue(0.00012345, 'number')).toBe('0.0001235');
  });

  it('compacts at 1M+', () => {
    expect(formatValue(2_500_000, 'number')).toBe('2.5M');
  });

  it('falls back to raw text for non-numerics', () => {
    expect(formatValue('oops', 'number')).toBe('oops');
  });
});

describe('formatValue — currency', () => {
  it('formats USD by default', () => {
    expect(formatValue(1234.5, 'currency')).toBe('$1,234.50');
  });

  it('formats other ISO codes via opts.currency (INR)', () => {
    expect(formatValue(1234.5, 'currency', { currency: 'INR' })).toBe('₹1,234.50');
  });

  it('compacts large amounts', () => {
    expect(formatValue(3_000_000, 'currency')).toBe('$3M');
  });

  it('parses strings that carry symbols or commas', () => {
    expect(formatValue('₹1,234.5', 'currency', { currency: 'INR' })).toBe('₹1,234.50');
    expect(formatValue('(1,234.5)', 'currency')).toBe('-$1,234.50');
  });

  it('falls back for non-numerics', () => {
    expect(formatValue('n/a', 'currency')).toBe('n/a');
  });
});

describe('formatValue — percent', () => {
  it('appends % to numbers already in percent units', () => {
    expect(formatValue(5.32, 'percent')).toBe('5.32%');
    expect(formatValue(-1.5, 'percent')).toBe('-1.5%');
  });

  it('re-formats strings already carrying %', () => {
    expect(formatValue('7.5%', 'percent')).toBe('7.5%');
    expect(formatValue(' 12.345 %', 'percent')).toBe('12.35%');
  });

  it('falls back for non-numerics', () => {
    expect(formatValue('high', 'percent')).toBe('high');
  });
});

describe('formatValue — date', () => {
  it('formats ISO dates', () => {
    expect(formatValue('2024-01-05', 'date')).toBe('Jan 5, 2024');
  });

  it('includes time when the value carries one', () => {
    const s = formatValue('2024-01-05 16:00:00', 'date');
    expect(s).toContain('Jan 5, 2024');
    expect(s).toContain('4:00 PM');
  });

  it('formats Date instances', () => {
    expect(formatValue(new Date('2024-01-05T00:00:00Z'), 'date')).toContain('Jan');
  });

  it('falls back for invalid dates', () => {
    expect(formatValue('n/a', 'date')).toBe('n/a');
    expect(formatValue('9999-99-99', 'date')).toBe('9999-99-99');
  });
});

describe('formatValue — text', () => {
  it('stringifies primitives and objects', () => {
    expect(formatValue(42, 'text')).toBe('42');
    expect(formatValue({ a: 1 }, 'text')).toBe('{"a":1}');
    expect(formatValue(null, 'text')).toBe(EMPTY_VALUE);
  });
});
