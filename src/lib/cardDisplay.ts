/**
 * Display heuristics for the Card widget: which mapped fields look like
 * change values (colored ▲/▼), which columns of a watchlist-style list
 * carry the name / price / change, which leaves read as "performance"
 * metrics, and how to swap the symbol inside a quote URL.
 */

import { normalizeKey } from './widgetFields';
import type { CardColumnMap, FieldMapping } from '@/types/widget';

// Not 'pc' — on Finnhub that key is previous close (a price), not a change.
const CHANGE_RE = /change|dp|%|percent/i;

/** True when a field reads as a price-movement value. */
export function looksLikeChange(field: FieldMapping): boolean {
  if (field.format === 'percent') return true;
  return CHANGE_RE.test(`${field.label} ${field.path}`);
}

/* ------------------------------------------------------------------ */
/* Watchlist column guessing                                            */
/* ------------------------------------------------------------------ */

export type ListColumns = CardColumnMap;

const LIST_EXACT: readonly [keyof ListColumns, RegExp][] = [
  ['name', /^(symbol|name|ticker|s|code|currency|base)$/],
  ['price', /^(price|last|close|c|rate|value|amount|ask|bid)$/],
  ['change', /^(change|changepct|changepercent|percentchange|pct|pctchange|dp|percent)$/],
];

/**
 * Loose tiers per role, tried in order — so `change_percentage`
 * (percent tier) wins over `change_amount` (change tier) no matter
 * which key appears first in the row.
 */
const LIST_LOOSE: readonly [keyof ListColumns, readonly RegExp[]][] = [
  ['name', [/symbol|ticker/, /name|code|currency/]],
  ['price', [/price|close/, /^last|rate|value|^c$|ask|bid/]],
  ['change', [/percent|pct|%/, /change|delta/]],
];

/**
 * Guess the name / price / change columns of a watchlist-style row list.
 * Exact names first, then tiered substring matches; a key is claimed by
 * at most one role, and roles stay empty when nothing plausible
 * matches — a wrong guess (e.g. `volume` as change) is worse than none.
 */
export function guessListColumns(keys: string[]): ListColumns {
  const cols: ListColumns = {};
  const norm = keys.map((key) => ({ key, n: normalizeKey(key) }));
  const claimed = () => Object.values(cols);
  for (const { key, n } of norm) {
    if (!n || claimed().includes(key)) continue;
    for (const [role, re] of LIST_EXACT) {
      if (cols[role] === undefined && re.test(n)) {
        cols[role] = key;
        break; // a key serves one role only
      }
    }
  }
  for (const [role, tiers] of LIST_LOOSE) {
    if (cols[role] !== undefined) continue;
    for (const re of tiers) {
      const hit = norm.find(
        ({ key, n }) => n && re.test(n) && !claimed().includes(key),
      );
      if (hit) {
        cols[role] = hit.key;
        break;
      }
    }
  }
  return cols;
}

/* ------------------------------------------------------------------ */
/* Change-column classification                                         */
/* ------------------------------------------------------------------ */

/**
 * True when the column key itself reads as a change value — either a
 * percentage (`change_percentage`, `dp`, `pct`) or an absolute move
 * (`change_amount`, Finnhub `d`). Deliberately stricter than
 * looksLikeChange: `pc` (previous close) and `volume` don't count.
 */
export function isChangeKey(key: string): boolean {
  const n = normalizeKey(key);
  return n === 'd' || /change|delta|pct|percent|%|dp/.test(n);
}

/** Subset of isChangeKey: the value is a percentage, so render a %. */
export function isPercentChangeKey(key: string): boolean {
  return /percent|pct|%|dp/.test(normalizeKey(key));
}

/* ------------------------------------------------------------------ */
/* Performance-field suggestions                                        */
/* ------------------------------------------------------------------ */

/** Keyword → weight; summed per leaf, ranked desc. */
const PERFORMANCE_TERMS: readonly [RegExp, number][] = [
  [/52w|52week|week52|fiftytwo/, 3],
  [/beta|alpha|sharpe|volatil/, 2],
  [/return|ytd|yoy|qoq|ttm|growth|cagr|ratio/, 2],
  [/eps|marketcap|dividend|yield|roe|roi|margin|profit|revenue|ebitda|bookvalue|pe$|peratio/, 2],
  [/high|low|range|average/, 1],
];

export const MAX_PERFORMANCE_SUGGESTIONS = 8;

/**
 * Rank leaf paths that read as performance metrics (52-week range,
 * beta, returns, valuation ratios…). Returns up to
 * MAX_PERFORMANCE_SUGGESTIONS paths, best first.
 */
export function suggestPerformanceFields(
  leaves: readonly { path: string }[],
): string[] {
  return leaves
    .map((l) => {
      // Not normalizeKey — its leading-digit strip would erase the "52".
      const n = l.path.toLowerCase().replace(/[^a-z0-9]/g, '');
      return {
        path: l.path,
        score: PERFORMANCE_TERMS.reduce(
          (sum, [re, w]) => sum + (re.test(n) ? w : 0),
          0,
        ),
      };
    })
    .filter((l) => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PERFORMANCE_SUGGESTIONS)
    .map((l) => l.path);
}

/* ------------------------------------------------------------------ */
/* Per-symbol quote URLs                                                */
/* ------------------------------------------------------------------ */

/**
 * Return `url` with its symbol parameter swapped to `symbol`. A
 * param literally named symbol/ticker/code/stock wins; otherwise any
 * param containing "symbol"/"ticker"; otherwise `symbol` is appended.
 * Unparseable URLs come back unchanged.
 */
export function urlWithSymbol(url: string, symbol: string): string {
  try {
    const u = new URL(url);
    const keys = [...u.searchParams.keys()];
    const key =
      keys.find((k) => /^(symbol|ticker|code|stock)$/i.test(k)) ??
      keys.find((k) => /symbol|ticker/i.test(k));
    u.searchParams.set(key ?? 'symbol', symbol);
    return u.toString();
  } catch {
    return url;
  }
}
