/**
 * JSON structure introspection for the widget field picker.
 *
 * - `flattenJson` lists every selectable leaf with a canonical path:
 *   dot segments for plain keys, `[i]` for array indices, and
 *   `["key"]` for keys that contain dots/brackets/quotes.
 * - `getByPath` reads values back by path. It also resolves ambiguous
 *   hand-written dot paths like `"Global Quote.05. price"` by matching
 *   the longest key at each level.
 * - `findArrays` locates tabular data: real arrays of objects, plus
 *   objects keyed by date (Alpha Vantage "Time Series" style) which
 *   are exposed as `{ date, ...values }` rows.
 */

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

/** Matches `YYYY-MM-DD` optionally followed by a time component. */
const DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function isDateString(value: string): boolean {
  const s = value.trim();
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(s.replace(' ', 'T')));
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Keys that can't appear as a bare dot segment without ambiguity. */
const NEEDS_BRACKETS = /[.[\]"']|^$/;

/** One path segment appended to `base` (`base === ''` means root level). */
function seg(key: string, base: string): string {
  if (NEEDS_BRACKETS.test(key)) {
    const escaped = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `${base}["${escaped}"]`;
  }
  return base === '' ? key : `${base}.${key}`;
}

/* ------------------------------------------------------------------ */
/* flattenJson                                                          */
/* ------------------------------------------------------------------ */

export type LeafType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'null'
  | 'object' // empty object — no leaves beneath it
  | 'array'; // empty array — no leaves beneath it

export interface FlatField {
  path: string;
  type: LeafType;
  /** Short printable preview of the leaf value. */
  sample: string;
}

const SAMPLE_MAX = 80;
const DEFAULT_MAX_LEAVES = 2000;

export function leafType(value: unknown): LeafType {
  if (value === null || value === undefined) return 'null';
  switch (typeof value) {
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return isDateString(value) ? 'date' : 'string';
    default:
      return 'object';
  }
}

export function sampleOf(value: unknown): string {
  const s =
    typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
  return s.length > SAMPLE_MAX ? `${s.slice(0, SAMPLE_MAX - 1)}…` : s;
}

/**
 * List every leaf in `root` as `{ path, type, sample }`. Traverses into
 * all object keys and array indices. `maxLeaves` caps output so a huge
 * API response can't freeze the picker.
 */
export function flattenJson(
  root: unknown,
  maxLeaves = DEFAULT_MAX_LEAVES,
): FlatField[] {
  const out: FlatField[] = [];
  const visit = (value: unknown, path: string): void => {
    if (out.length >= maxLeaves) return;
    if (isRecord(value)) {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        out.push({ path, type: 'object', sample: '{}' });
        return;
      }
      for (const k of keys) visit(value[k], seg(k, path));
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out.push({ path, type: 'array', sample: '[]' });
        return;
      }
      for (let i = 0; i < value.length; i++) visit(value[i], `${path}[${i}]`);
      return;
    }
    out.push({ path, type: leafType(value), sample: sampleOf(value) });
  };
  visit(root, '');
  return out;
}

/* ------------------------------------------------------------------ */
/* getByPath                                                            */
/* ------------------------------------------------------------------ */

interface Frag {
  key: string;
  /** `true` for explicit `[…]` tokens — never merged with neighbors. */
  fixed: boolean;
}

/**
 * Split a path into fragments. Dot-separated text becomes mergeable
 * fragments; `[i]` and `["key"]`/`['key']` become fixed fragments.
 */
function tokenize(path: string): Frag[] {
  const frags: Frag[] = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) {
      frags.push({ key: buf, fixed: false });
      buf = '';
    }
  };
  while (i < path.length) {
    const ch = path[i];
    if (ch === '.') {
      flush();
      i++;
      continue;
    }
    if (ch === '[') {
      flush();
      const end = path.indexOf(']', i);
      if (end === -1) {
        buf += path.slice(i); // malformed — treat rest as literal text
        break;
      }
      const inner = path.slice(i + 1, end).trim();
      const quote = inner[0];
      const quoted =
        inner.length >= 2 &&
        (quote === '"' || quote === "'") &&
        inner[inner.length - 1] === quote;
      frags.push({
        key: quoted ? inner.slice(1, -1).replace(/\\(["'\\])/g, '$1') : inner,
        fixed: true,
      });
      i = end + 1;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return frags;
}

/**
 * Read `root[path]`. Supports `a.b`, `a[0].b`, `a["key.with.dots"]`,
 * root arrays (`[0].a`), and dotted keys written without brackets —
 * at each level the longest matching key wins, so
 * `"Global Quote.05. price"` finds the `"05. price"` key.
 * An empty path returns `root` itself.
 */
export function getByPath(root: unknown, path: string): unknown {
  const frags = tokenize(path);
  if (frags.length === 0) return root;
  let cur = root;
  let i = 0;
  while (i < frags.length) {
    if (cur === null || cur === undefined) return undefined;
    const f = frags[i];
    if (f.fixed) {
      cur = (cur as Record<string, unknown>)[f.key];
      i++;
      continue;
    }
    // Mergeable dot-segments — try longest join first (dotted keys),
    // then shorter prefixes (nested objects).
    let end = i;
    while (end < frags.length && !frags[end].fixed) end++;
    let matched = false;
    for (let j = end; j > i; j--) {
      const key = frags
        .slice(i, j)
        .map((s) => s.key)
        .join('.');
      if (isRecord(cur) || Array.isArray(cur)) {
        if (key in cur) {
          cur = (cur as Record<string, unknown>)[key];
          i = j;
          matched = true;
          break;
        }
      }
    }
    if (!matched) return undefined;
  }
  return cur;
}

/* ------------------------------------------------------------------ */
/* findArrays                                                           */
/* ------------------------------------------------------------------ */

export interface ArrayInfo {
  /** Path to the node — the array itself, or the date-keyed object. */
  path: string;
  /** 'array' for real arrays; 'dateMap' for objects keyed by date. */
  kind: 'array' | 'dateMap';
  /** Item count (array length or number of date keys). */
  count: number;
  /** Keys of the first item; 'date' prepended for dateMap rows. */
  keys: string[];
}

/** Every key looks like a date and every value is a plain object. */
function isDateKeyed(rec: Record<string, unknown>, keys: string[]): boolean {
  return (
    keys.length > 0 &&
    keys.every(isDateString) &&
    keys.every((k) => isRecord(rec[k]))
  );
}

/**
 * Find paths to tabular data anywhere in `root`:
 * - arrays whose first non-null element is an object → `{ kind: 'array' }`
 * - objects keyed by date with object values (e.g. Alpha Vantage
 *   "Time Series (Daily)") → `{ kind: 'dateMap' }`, to be read as
 *   rows of `{ date, ...values }`
 *
 * Arrays of primitives and date-keyed maps with scalar values are
 * skipped — they aren't renderable as table/chart rows.
 */
export function findArrays(root: unknown): ArrayInfo[] {
  const out: ArrayInfo[] = [];
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      const first = value.find((v) => v !== null && v !== undefined);
      if (isRecord(first)) {
        out.push({ path, kind: 'array', count: value.length, keys: Object.keys(first) });
      }
      for (let i = 0; i < value.length; i++) visit(value[i], `${path}[${i}]`);
      return;
    }
    if (!isRecord(value)) return;
    const keys = Object.keys(value);
    if (isDateKeyed(value, keys)) {
      const first = value[keys[0]] as Record<string, unknown>;
      out.push({
        path,
        kind: 'dateMap',
        count: keys.length,
        keys: ['date', ...Object.keys(first)],
      });
      return; // the map itself is the table — don't index into its rows
    }
    for (const k of keys) visit(value[k], seg(k, path));
  };
  visit(root, '');
  return out;
}
