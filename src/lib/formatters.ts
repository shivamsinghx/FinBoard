/**
 * Display formatting for mapped API fields (`FieldMapping.format`).
 *
 * Everything tolerates strings that contain numbers ("1,234.5",
 * "$9.99", "5.32%", "(1,000)") and falls back to the raw value when
 * a value can't be coerced into the requested format.
 */

import { isDateString } from '@/lib/jsonPaths';
import type { DataFormat } from '@/types/widget';

export interface FormatOptions {
  /** ISO 4217 code used by the 'currency' format. Default 'USD'. */
  currency?: string;
  /** Intl locale. Default 'en-US'. */
  locale?: string;
}

/** Placeholder shown for null / undefined values. */
export const EMPTY_VALUE = '—';

/** Absolute magnitude at which compact notation kicks in (1M+). */
const COMPACT_ABOVE = 1_000_000;

const NUMERIC_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Coerce a value to a finite number. Strings may carry grouping commas,
 * whitespace, a currency symbol, a trailing `%`, or accounting-style
 * parentheses for negatives. Anything else returns null.
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let s = value.trim();
  if (!s) return null;
  let negative = false;
  const parens = s.match(/^\((.*)\)$/);
  if (parens) {
    negative = true;
    s = parens[1].trim();
  }
  s = s.replace(/[%$€£₹,\s]/g, '');
  if (!NUMERIC_RE.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function toDate(value: unknown): { date: Date; hasTime: boolean } | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { date: value, hasTime: true };
  }
  if (typeof value !== 'string' || !isDateString(value)) return null;
  const s = value.trim();
  return { date: new Date(s.replace(' ', 'T')), hasTime: s.includes(':') };
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return typeof value === 'object' ? (JSON.stringify(value) ?? '') : String(value);
}

/** Number formatting shared by 'auto', 'number' and 'percent'. */
function numberIntl(
  n: number,
  locale: string,
  extra: Intl.NumberFormatOptions = {},
): string {
  const abs = Math.abs(n);
  if (abs >= COMPACT_ABOVE) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
      ...extra,
    }).format(n);
  }
  // Sub-unit values (e.g. crypto prices) need significant digits, not
  // a fixed 2-decimal cap that would round them to 0.
  const sized: Intl.NumberFormatOptions =
    abs > 0 && abs < 1
      ? { maximumSignificantDigits: 4 }
      : { maximumFractionDigits: 2 };
  return new Intl.NumberFormat(locale, { ...sized, ...extra }).format(n);
}

function dateIntl(d: Date, hasTime: boolean, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(hasTime ? { timeStyle: 'short' as const } : {}),
  }).format(d);
}

/**
 * Format a mapped field value for display.
 *
 * - `auto` — numbers (incl. numeric strings) get grouping + compact
 *   notation, date-shaped strings get a medium date, booleans Yes/No,
 *   everything else passes through as text.
 * - `currency` — Intl currency; `opts.currency` selects the code
 *   (USD / INR / any ISO 4217). Compacts at 1M+.
 * - `percent` — the value is already in percent units ("5.32" or
 *   "5.32%" → `5.32%`); it is NOT multiplied by 100.
 */
/** "30s" / "5m" / "1.5h" / "manual" (0 or disabled refresh). */
export function formatInterval(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return 'manual';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = sec / 3600;
  return `${Math.round(h * 10) / 10}h`;
}

export function formatValue(
  value: unknown,
  format: DataFormat = 'auto',
  opts: FormatOptions = {},
): string {
  const locale = opts.locale ?? 'en-US';
  if (value === null || value === undefined) return EMPTY_VALUE;

  switch (format) {
    case 'text':
      return stringify(value);

    case 'number': {
      const n = toNumber(value);
      return n === null ? stringify(value) : numberIntl(n, locale);
    }

    case 'currency': {
      const n = toNumber(value);
      if (n === null) return stringify(value);
      const abs = Math.abs(n);
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: (opts.currency ?? 'USD').toUpperCase(),
        notation: abs >= COMPACT_ABOVE ? 'compact' : 'standard',
        maximumFractionDigits: abs > 0 && abs < 1 ? 4 : 2,
      }).format(n);
    }

    case 'percent': {
      const n = toNumber(value);
      return n === null ? stringify(value) : `${numberIntl(n, locale)}%`;
    }

    case 'date': {
      const parsed = toDate(value);
      return parsed ? dateIntl(parsed.date, parsed.hasTime, locale) : stringify(value);
    }

    case 'auto':
    default: {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return stringify(value);
      const n = toNumber(value);
      if (n !== null) return numberIntl(n, locale);
      const parsed = toDate(value);
      if (parsed) return dateIntl(parsed.date, parsed.hasTime, locale);
      return stringify(value);
    }
  }
}
