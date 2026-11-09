'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Plus, Search } from 'lucide-react';
import { findArrays, flattenJson, type ArrayInfo } from '@/lib/jsonPaths';
import { columnsForRows, rowsAtPath } from '@/lib/widgetFields';
import type { WidgetType } from '@/types/widget';

const RAW_PREVIEW_LINES = 50;
const LEAF_RENDER_CAP = 300;

interface JsonExplorerProps {
  mode: WidgetType;
  /** The payload saved by the successful "Test" call. */
  data: unknown;
  selectedList: ArrayInfo | null;
  onSelectList: (list: ArrayInfo | null) => void;
  /** Keys already picked — those rows show a check instead of "+". */
  addedKeys: ReadonlySet<string>;
  /**
   * Card mode is called with a leaf path; table/chart with a column key
   * (the parent decides what each means).
   */
  onAdd: (key: string) => void;
}

/**
 * Response explorer for the add-widget modal.
 *
 * Card mode shows a searchable list of every leaf path. Table/chart
 * mode first asks which list (array or date-keyed map) to use, then
 * shows that list's deduped columns — never per-row paths.
 */
export function JsonExplorer({
  mode,
  data,
  selectedList,
  onSelectList,
  addedKeys,
  onAdd,
}: JsonExplorerProps) {
  const [search, setSearch] = useState('');
  const [arraysOnly, setArraysOnly] = useState(false);
  const q = search.trim().toLowerCase();

  const lists = useMemo(() => (mode === 'card' ? [] : findArrays(data)), [data, mode]);
  const leaves = useMemo(
    () => (mode === 'card' ? flattenJson(data) : []),
    [data, mode],
  );
  const shownLeaves = useMemo(
    () =>
      leaves.filter(
        (f) =>
          (!q || f.path.toLowerCase().includes(q)) &&
          (!arraysOnly || f.path.includes('[')),
      ),
    [leaves, q, arraysOnly],
  );
  const rows = useMemo(
    () =>
      mode !== 'card' && selectedList
        ? rowsAtPath(data, selectedList.path)
        : [],
    [mode, data, selectedList],
  );
  const columns = useMemo(() => columnsForRows(rows), [rows]);
  const rawJson = useMemo(() => {
    const text = JSON.stringify(data, null, 2) ?? '';
    const lines = text.split('\n');
    return lines.length > RAW_PREVIEW_LINES
      ? `${lines.slice(0, RAW_PREVIEW_LINES).join('\n')}\n…`
      : text;
  }, [data]);

  return (
    <div className="mt-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Fields
      </p>

      {mode === 'card' ? (
        <>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter paths…"
                className="w-full rounded-lg border border-subtle bg-raised py-2 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-faint focus:border-accent"
              />
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={arraysOnly}
                onChange={(e) => setArraysOnly(e.target.checked)}
                className="size-3.5 accent-accent"
              />
              Arrays only
            </label>
          </div>

          <ul className="mt-2 max-h-52 divide-y divide-subtle overflow-y-auto rounded-lg border border-subtle">
            {shownLeaves.slice(0, LEAF_RENDER_CAP).map((f) => (
              <FieldPickRow
                key={f.path}
                title={f.path}
                sub={f.sample}
                badge={f.type}
                added={addedKeys.has(f.path)}
                onAdd={() => onAdd(f.path)}
              />
            ))}
            {shownLeaves.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-faint">
                No matching fields.
              </li>
            )}
          </ul>
          {shownLeaves.length > LEAF_RENDER_CAP && (
            <p className="mt-1 text-[11px] text-faint">
              +{shownLeaves.length - LEAF_RENDER_CAP} more — refine the search.
            </p>
          )}
        </>
      ) : !selectedList ? (
        <ListPicker lists={lists} onSelect={onSelectList} />
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectList(null)}
              className="flex items-center gap-0.5 text-xs text-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Lists
            </button>
            <span
              className="min-w-0 flex-1 truncate font-mono text-xs text-faint"
              title={selectedList.path}
            >
              {selectedList.path}
            </span>
            <span className="shrink-0 text-[11px] text-faint">
              {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </span>
          </div>
          <ul className="mt-2 max-h-52 divide-y divide-subtle overflow-y-auto rounded-lg border border-subtle">
            {columns.map((c) => (
              <FieldPickRow
                key={c.key}
                title={c.key}
                sub={c.sample}
                badge={c.type}
                added={addedKeys.has(c.key)}
                onAdd={() => onAdd(c.key)}
              />
            ))}
            {columns.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-faint">
                No columns in this list.
              </li>
            )}
          </ul>
        </>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted transition-colors hover:text-ink">
          Raw response
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-subtle bg-raised p-3 font-mono text-[11px] leading-relaxed text-muted">
          {rawJson}
        </pre>
      </details>
    </div>
  );
}

/**
 * The "pick a list" step — arrays and date-keyed maps found in the
 * payload. Exported so card-type pickers (movers/watchlist) can use
 * it outside the full explorer.
 */
export function ListPicker({
  lists,
  onSelect,
}: {
  lists: ArrayInfo[];
  onSelect: (list: ArrayInfo | null) => void;
}) {
  return (
    <ul className="mt-2 max-h-52 divide-y divide-subtle overflow-y-auto rounded-lg border border-subtle">
      {lists.map((l) => (
        <li key={l.path}>
          <button
            type="button"
            onClick={() => onSelect(l)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-raised"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-ink">{l.path}</p>
              <p className="truncate text-[11px] text-faint">
                {l.count} {l.count === 1 ? 'row' : 'rows'}
                {l.keys.length > 0 && ` · ${l.keys.slice(0, 5).join(', ')}`}
                {l.keys.length > 5 && '…'}
              </p>
            </div>
            {l.kind === 'dateMap' && (
              <span className="shrink-0 rounded border border-subtle bg-raised px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">
                dates
              </span>
            )}
          </button>
        </li>
      ))}
      {lists.length === 0 && (
        <li className="px-3 py-3 text-center text-xs text-faint">
          No lists found — Card mode can still use any field.
        </li>
      )}
    </ul>
  );
}

function FieldPickRow({
  title,
  sub,
  badge,
  added,
  onAdd,
}: {
  title: string;
  sub: string;
  badge: string;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-2 px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-ink" title={title}>
          {title}
        </p>
        <p className="truncate text-[11px] text-faint" title={sub}>
          {sub}
        </p>
      </div>
      <span className="shrink-0 rounded border border-subtle bg-raised px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint">
        {badge}
      </span>
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        aria-label={added ? `${title} added` : `Add ${title}`}
        className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors ${
          added
            ? 'text-up'
            : 'text-muted hover:bg-accent-soft hover:text-accent'
        } disabled:pointer-events-none`}
      >
        {added ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
      </button>
    </li>
  );
}
