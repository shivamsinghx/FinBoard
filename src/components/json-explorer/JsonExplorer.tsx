'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { findArrays, flattenJson, type ArrayInfo } from '@/lib/jsonPaths';
import { columnsForRows, rowsAtPath } from '@/lib/widgetFields';
import { useHighlightedCode } from '@/hooks/use-highlighted-code';
import type { WidgetType } from '@/types/widget';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from '@/components/ui/code-block';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

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
  const [arraysOnly, setArraysOnly] = useState(false);

  const lists = useMemo(() => (mode === 'card' ? [] : findArrays(data)), [data, mode]);
  const leaves = useMemo(
    () => (mode === 'card' ? flattenJson(data) : []),
    [data, mode],
  );
  // Text search is handled by Command; this only applies the
  // "arrays only" pre-filter to what cmdk can match against.
  const shownLeaves = useMemo(
    () => leaves.filter((f) => !arraysOnly || f.path.includes('[')),
    [leaves, arraysOnly],
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
          <div className="mt-2 flex items-center justify-end gap-2">
            <Label
              htmlFor="explorer-arrays-only"
              className="text-xs font-normal text-muted"
            >
              Arrays only
            </Label>
            <Switch
              id="explorer-arrays-only"
              size="sm"
              checked={arraysOnly}
              onCheckedChange={(checked) => setArraysOnly(checked)}
            />
          </div>
          <FieldPickCommand className="mt-2" label="JSON fields">
            {shownLeaves.slice(0, LEAF_RENDER_CAP).map((f) => (
              <FieldPickItem
                key={f.path}
                value={f.path}
                title={f.path}
                sub={f.sample}
                badge={f.type}
                added={addedKeys.has(f.path)}
                onAdd={onAdd}
              />
            ))}
          </FieldPickCommand>
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
          <FieldPickCommand className="mt-2" label="List columns">
            {columns.map((c) => (
              <FieldPickItem
                key={c.key}
                value={c.key}
                title={c.key}
                sub={c.sample}
                badge={c.type}
                added={addedKeys.has(c.key)}
                onAdd={onAdd}
              />
            ))}
          </FieldPickCommand>
        </>
      )}

      <Collapsible className="mt-3">
        <CollapsibleTrigger className="group flex cursor-pointer items-center gap-1 text-xs text-muted transition-colors hover:text-ink">
          <ChevronRight
            className="size-3.5 transition-transform group-data-[panel-open]:rotate-90"
            aria-hidden
          />
          Raw response
        </CollapsibleTrigger>
        <CollapsibleContent>
          <RawJsonBlock code={rawJson} />
        </CollapsibleContent>
      </Collapsible>
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
    <ScrollArea className="mt-2 max-h-52 rounded-lg border border-input">
      <ul className="divide-y divide-border">
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
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] uppercase tracking-wide"
                >
                  dates
                </Badge>
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
    </ScrollArea>
  );
}

/** cmdk-powered pick list — built-in search plus arrow/Enter selection. */
function FieldPickCommand({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Command label={label} className={`border border-input bg-surface ${className ?? ''}`}>
      <CommandInput placeholder="Filter…" />
      <CommandList className="max-h-52">
        <CommandEmpty className="py-3 text-xs text-faint">
          No matching fields.
        </CommandEmpty>
        <CommandGroup>{children}</CommandGroup>
      </CommandList>
    </Command>
  );
}

function FieldPickItem({
  value,
  title,
  sub,
  badge,
  added,
  onAdd,
}: {
  value: string;
  title: string;
  sub: string;
  badge: string;
  added: boolean;
  onAdd: (key: string) => void;
}) {
  return (
    <CommandItem
      value={value}
      disabled={added}
      onSelect={() => onAdd(value)}
      className="gap-2"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs text-ink" title={title}>
          {title}
        </p>
        <p className="truncate text-[11px] text-faint" title={sub}>
          {sub}
        </p>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 text-[10px] uppercase tracking-wide"
      >
        {badge}
      </Badge>
      <CommandShortcut>
        {added ? (
          <Check className="size-3.5 text-up" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
      </CommandShortcut>
    </CommandItem>
  );
}

/** Collapsed "View raw JSON" panel — shiki-highlighted, copyable. */
function RawJsonBlock({ code }: { code: string }) {
  const lines = useHighlightedCode(code, 'json');
  return (
    <CodeBlock size="sm" className="mt-2 bg-raised">
      <CodeBlockHeader>
        <CodeBlockTitle>JSON</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent className="max-h-48 text-[11px]">
        {lines.map((line, i) => (
          <CodeBlockLine key={i}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}
