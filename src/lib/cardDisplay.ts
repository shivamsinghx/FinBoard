/**
 * Display heuristics for the Card widget: which mapped fields look like
 * change values (colored ▲/▼), and which columns of a watchlist-style
 * list carry the name / price / change.
 */

import { normalizeKey } from './widgetFields';
import type { FieldMapping } from '@/types/widget';

const CHANGE_RE = /change|dp|pc|%|percent/i;

/** True when a field reads as a price-movement value. */
export function looksLikeChange(field: FieldMapping): boolean {
  if (field.format === 'percent') return true;
  return CHANGE_RE.test(`${field.label} ${field.path}`);
}

/* ------------------------------------------------------------------ */
/* Watchlist column guessing                                            */
/* ------------------------------------------------------------------ */

export interface ListColumns {
  name?: string;
  price?: string;
  change?: string;
}

const LIST_EXACT: readonly [keyof ListColumns, RegExp][] = [
  ['name', /^(symbol|name|ticker|s|code|currency|base)$/],
  ['price', /^(price|last|close|c|rate|value|amount|ask|bid)$/],
  ['change', /^(change|changepct|changepercent|percentchange|pct|pctchange|dp|percent)$/],
];

const LIST_LOOSE: readonly [keyof ListColumns, RegExp][] = [
  ['name', /symbol|name|ticker|code|currency/],
  ['price', /price|close|last|rate|amount/],
  ['change', /change|percent|pct|%/],
];

/**
 * Guess the name / price / change columns of a watchlist-style row list.
 * Exact names first, then substring matches; each role is claimed at
 * most once.
 */
export function guessListColumns(keys: string[]): ListColumns {
  const cols: ListColumns = {};
  const norm = keys.map((key) => ({ key, n: normalizeKey(key) }));
  for (const pass of [LIST_EXACT, LIST_LOOSE]) {
    for (const { key, n } of norm) {
      if (!n) continue;
      for (const [role, re] of pass) {
        if (cols[role] === undefined && re.test(n)) cols[role] = key;
      }
    }
  }
  return cols;
}
