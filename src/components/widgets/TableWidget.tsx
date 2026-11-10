'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type PaginationState,
  type SortingFn,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useWidgetData } from '@/hooks/useWidgetData';
import { looksLikeChange } from '@/lib/cardDisplay';
import { formatValue, toNumber } from '@/lib/formatters';
import { rowsAtPath } from '@/lib/widgetFields';
import {
  passesRange,
  rangeIsActive,
  rowMatchesQuery,
  smartCompare,
  type RangeFilter,
} from '@/lib/tableModel';
import type { WidgetInstance } from '@/types/widget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WidgetShell } from './WidgetShell';

const PAGE_SIZES = [10, 25, 50] as const;
const NUMERIC_SAMPLE = 10;

type Row = Record<string, unknown>;

const smartSort: SortingFn<Row> = (rowA, rowB, columnId) =>
  smartCompare(rowA.getValue(columnId), rowB.getValue(columnId));

const numRangeFilter: FilterFn<Row> = (row, columnId, value: RangeFilter) =>
  passesRange(row.getValue(columnId), value?.min ?? '', value?.max ?? '');

/** Small debounce — keeps keystrokes snappy on large lists. */
function useDebouncedValue<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function TableWidget({ widget }: { widget: WidgetInstance }) {
  const cfg = widget.config;
  const query = useWidgetData(cfg.endpoint || null, cfg.refreshIntervalSec);

  const rows = useMemo(
    () => (cfg.table?.listPath ? rowsAtPath(query.data, cfg.table.listPath) : []),
    [query.data, cfg.table?.listPath],
  );
  const fieldById = useMemo(
    () => new Map(cfg.fields.map((f) => [f.path, f])),
    [cfg.fields],
  );

  /* ---- local view state (not persisted) ---- */
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [ranges, setRanges] = useState<Record<string, RangeFilter>>({});
  const debouncedSearch = useDebouncedValue(search);

  const visibleKeys = useMemo(
    () =>
      cfg.fields
        .filter((f) => columnVisibility[f.path] !== false)
        .map((f) => f.path),
    [cfg.fields, columnVisibility],
  );

  /** Search pre-filters rows so it can honour "visible columns only". */
  const searched = useMemo(
    () => rows.filter((r) => rowMatchesQuery(r, visibleKeys, debouncedSearch)),
    [rows, visibleKeys, debouncedSearch],
  );

  /** Columns worth a numeric filter — any sampled row parses numeric. */
  const numericFields = useMemo(
    () =>
      cfg.fields.filter((f) =>
        rows
          .slice(0, NUMERIC_SAMPLE)
          .some((r) => toNumber(r[f.path]) !== null),
      ),
    [cfg.fields, rows],
  );
  const numericFieldSet = useMemo(
    () => new Set(numericFields.map((f) => f.path)),
    [numericFields],
  );

  const columnFilters = useMemo<ColumnFiltersState>(
    () =>
      Object.entries(ranges)
        .filter(([, r]) => rangeIsActive(r))
        .map(([id, value]) => ({ id, value })),
    [ranges],
  );
  const activeRangeCount = columnFilters.length;

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      cfg.fields.map((f) => ({
        id: f.path,
        accessorFn: (row) => row[f.path],
        header: f.label,
        sortingFn: smartSort,
        filterFn: numRangeFilter,
      })),
    [cfg.fields],
  );

  const table = useReactTable({
    data: searched,
    columns,
    state: { sorting, columnFilters, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const { pageIndex, pageSize } = pagination;
  const pageStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = Math.min((pageIndex + 1) * pageSize, filteredCount);
  const filtering = debouncedSearch.trim() !== '' || activeRangeCount > 0;

  function setRange(path: string, side: 'min' | 'max', v: string) {
    setRanges((r) => {
      const cur = r[path] ?? { min: '', max: '' };
      return { ...r, [path]: { ...cur, [side]: v } };
    });
  }
  function clearAll() {
    setSearch('');
    setRanges({});
  }

  return (
    <WidgetShell widget={widget} query={query} empty={rows.length === 0}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <InputGroup className="h-8 w-44">
          <InputGroupAddon>
            <Search className="size-3.5" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            aria-label="Search rows"
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X className="size-3" aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <span className="text-[11px] text-faint">
          {filteredCount} of {rows.length} items
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {numericFields.length > 0 && (
            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5" />
                }
              >
                <SlidersHorizontal className="size-3.5" aria-hidden />
                Filter
                {activeRangeCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1 text-[10px] text-faint"
                  >
                    {activeRangeCount}
                  </Badge>
                )}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                {numericFields.map((f) => (
                  <div key={f.path}>
                    <p className="text-[11px] font-medium text-muted">
                      {f.label}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Input
                        inputMode="decimal"
                        placeholder="Min"
                        aria-label={`${f.label} minimum`}
                        className="h-7 px-2 text-xs"
                        value={ranges[f.path]?.min ?? ''}
                        onChange={(e) => setRange(f.path, 'min', e.target.value)}
                      />
                      <span className="text-faint">–</span>
                      <Input
                        inputMode="decimal"
                        placeholder="Max"
                        aria-label={`${f.label} maximum`}
                        className="h-7 px-2 text-xs"
                        value={ranges[f.path]?.max ?? ''}
                        onChange={(e) => setRange(f.path, 'max', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {activeRangeCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRanges({})}
                  >
                    Clear filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-1.5" />
              }
            >
              <Columns3 className="size-3.5" aria-hidden />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllLeafColumns().map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {fieldById.get(col.id)?.label ?? col.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredCount === 0 && filtering ? (
        <Empty className="min-h-24 gap-2 py-6">
          <EmptyHeader>
            <EmptyTitle className="text-xs font-normal text-muted">
              {debouncedSearch.trim()
                ? `No rows match “${debouncedSearch.trim()}”`
                : 'No rows match the filters.'}
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={clearAll}
            >
              Clear
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="max-h-full overflow-auto rounded-md border border-subtle">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="sticky top-0 z-10 bg-surface px-2 py-0"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex h-8 w-full min-w-0 items-center gap-1 text-left text-xs font-medium text-faint transition-colors hover:text-ink"
                        >
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="size-3 shrink-0" aria-hidden />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="size-3 shrink-0" aria-hidden />
                          ) : (
                            <ArrowUpDown
                              className="size-3 shrink-0 opacity-40"
                              aria-hidden
                            />
                          )}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const f = fieldById.get(cell.column.id);
                    const raw = cell.getValue();
                    const change =
                      f && looksLikeChange(f) ? toNumber(raw) : null;
                    return (
                      <TableCell
                        key={cell.id}
                        className={`px-2 py-1.5 text-xs ${
                          change !== null && change !== 0
                            ? change > 0
                              ? 'text-up'
                              : 'text-down'
                            : 'text-ink'
                        } ${f && numericFieldSet.has(f.path) ? 'tabular-nums' : ''}`}
                      >
                        {formatValue(raw, f?.format ?? 'auto')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <Select
          items={PAGE_SIZE_LABELS}
          value={String(pageSize)}
          onValueChange={(v) => {
            if (!v) return;
            table.setPageSize(Number(v));
            table.setPageIndex(0);
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Rows per page"
            className="w-[64px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[11px] text-faint">rows</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[11px] text-faint">
            {pageStart}–{pageEnd} of {filteredCount}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </WidgetShell>
  );
}

const PAGE_SIZE_LABELS = Object.fromEntries(
  PAGE_SIZES.map((n) => [String(n), `${n} / page`]),
);
