'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, Loader2, X } from 'lucide-react';
import { selectEditingWidget, useDashboardStore } from '@/store/dashboardStore';
import { findArrays, flattenJson, type ArrayInfo } from '@/lib/jsonPaths';
import {
  columnsForRows,
  guessOhlcFields,
  lastPathSegment,
  prettifyKey,
  rowsAtPath,
  type OhlcGuess,
} from '@/lib/widgetFields';
import { guessListColumns, suggestPerformanceFields } from '@/lib/cardDisplay';
import { FRIENDLY_ERRORS } from '@/lib/proxyErrors';
import type { ProxyErrorCode } from '@/types/api';
import type {
  ApiProvider,
  CardColumnMap,
  CardKind,
  ChartKind,
  FieldMapping,
  WidgetConfig,
  WidgetInstance,
  WidgetType,
} from '@/types/widget';
import { JsonExplorer, ListPicker } from '@/components/json-explorer/JsonExplorer';
import {
  CardColumnFields,
  ChartFields,
  FieldList,
} from '@/components/json-explorer/SelectedFields';
import { SymbolsInput } from '@/components/json-explorer/SymbolsInput';

const MODE_TABS: { type: WidgetType; label: string }[] = [
  { type: 'card', label: 'Card' },
  { type: 'table', label: 'Table' },
  { type: 'chart', label: 'Chart' },
];

/** Card sub-types shown by the "Card type" selector. */
type CardType = 'financial' | 'performance' | 'movers' | 'watchlist';
type WatchlistSource = 'list' | 'symbols';

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: 'financial', label: 'Financial data' },
  { value: 'performance', label: 'Performance' },
  { value: 'movers', label: 'Gainers / losers' },
  { value: 'watchlist', label: 'Watchlist' },
];

const WATCHLIST_SOURCES: { value: WatchlistSource; label: string }[] = [
  { value: 'list', label: 'From list' },
  { value: 'symbols', label: 'From symbols' },
];

const EXAMPLE_APIS: { label: string; url: string }[] = [
  {
    label: 'Coinbase · BTC rates',
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
  },
  {
    label: 'Finnhub · AAPL quote',
    url: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
  },
  {
    label: 'Finnhub · AAPL metrics',
    url: 'https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all',
  },
  {
    label: 'Finnhub · AAPL candles',
    url: 'https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1704067200&to=1735689600',
  },
  {
    label: 'Alpha Vantage · IBM daily',
    url: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo',
  },
  {
    label: 'Alpha Vantage · Gainers & losers',
    url: 'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo',
  },
];

const OHLC_ROLES = ['open', 'high', 'low', 'close'] as const;
const MIN_REFRESH_SEC = 10;
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Result of the one-shot "Test" call — kept for the field picker. */
type TestState =
  | { phase: 'idle' }
  | { phase: 'testing' }
  | { phase: 'ok'; url: string; data: unknown; fields: number; lists: number }
  | { phase: 'fail'; code: ProxyErrorCode; error: string | null };

type Errors = Partial<Record<'name' | 'url' | 'fields' | 'refresh', string>>;

function detectProvider(endpoint: string): ApiProvider {
  try {
    const host = new URL(endpoint).hostname.toLowerCase();
    if (host === 'finnhub.io' || host.endsWith('.finnhub.io')) return 'finnhub';
    if (host === 'alphavantage.co' || host.endsWith('.alphavantage.co')) {
      return 'alpha-vantage';
    }
  } catch {
    /* fall through — invalid or unknown host */
  }
  return 'custom';
}

export function AddWidgetModal() {
  const addOpen = useDashboardStore((s) => s.addWidgetOpen);
  const prefill = useDashboardStore((s) => s.addWidgetPrefill);
  const editing = useDashboardStore(selectEditingWidget);

  if (!addOpen && !editing) return null;
  return (
    <ModalPanel
      key={editing ? editing.id : 'add'}
      initialUrl={editing ? editing.config.endpoint : prefill}
      editing={editing}
    />
  );
}

/** Mounted only while open, so all state resets per open/edit target. */
function ModalPanel({
  initialUrl,
  editing,
}: {
  initialUrl: string;
  editing: WidgetInstance | null;
}) {
  const closeAddWidget = useDashboardStore((s) => s.closeAddWidget);
  const closeWidgetEditor = useDashboardStore((s) => s.closeWidgetEditor);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const updateWidgetConfig = useDashboardStore((s) => s.updateWidgetConfig);
  const close = editing ? closeWidgetEditor : closeAddWidget;
  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.config.title ?? '');
  const [url, setUrl] = useState(editing?.config.endpoint ?? initialUrl);
  const [refreshSec, setRefreshSec] = useState(
    editing?.config.refreshIntervalSec ?? 60,
  );
  const [test, setTest] = useState<TestState>({ phase: 'idle' });
  const [mode, setMode] = useState<WidgetType>(editing?.type ?? 'card');
  const [tried, setTried] = useState(false);
  /** Guards against stale responses and StrictMode double-effects. */
  const seqRef = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ---- field selection state (prefilled from the widget when editing) ---- */
  const [selectedList, setSelectedList] = useState<ArrayInfo | null>(() => {
    const lp =
      editing?.config.table?.listPath ??
      editing?.config.chart?.listPath ??
      editing?.config.card?.listPath;
    // Only the path is persisted — kind/count/keys are derived from data.
    return lp ? { path: lp, kind: 'array', count: 0, keys: [] } : null;
  });
  /* ---- card-type state (prefilled from card settings when editing) ---- */
  const [cardType, setCardType] = useState<CardType>(() => {
    const k = editing?.config.card?.kind;
    if (k === 'performance') return 'performance';
    if (k === 'gainers' || k === 'losers') return 'movers';
    if (k === 'watchlist') return 'watchlist';
    return 'financial';
  });
  const [moversDir, setMoversDir] = useState<'gainers' | 'losers'>(
    editing?.config.card?.kind === 'losers' ? 'losers' : 'gainers',
  );
  const [watchlistSource, setWatchlistSource] = useState<WatchlistSource>(
    editing?.config.card?.listPath ? 'list' : 'symbols',
  );
  const [symbols, setSymbols] = useState<string[]>(
    editing?.config.card?.symbols ?? [],
  );
  const [cardColumns, setCardColumns] = useState<CardColumnMap>(
    editing?.config.card?.columns ?? {},
  );
  const [cardFields, setCardFields] = useState<FieldMapping[]>(
    editing?.type === 'card' ? editing.config.fields : [],
  );
  const [tableFields, setTableFields] = useState<FieldMapping[]>(
    editing?.type === 'table' ? editing.config.fields : [],
  );
  const [chartType, setChartType] = useState<ChartKind>(
    editing?.config.chart?.kind ?? 'line',
  );
  const [xField, setXField] = useState<string | null>(
    editing?.config.chart?.xField ?? null,
  );
  const [chartValues, setChartValues] = useState<FieldMapping[]>(
    editing?.type === 'chart' && editing.config.chart?.kind !== 'candle'
      ? editing.config.fields
      : [],
  );
  const [ohlc, setOhlc] = useState<OhlcGuess>(editing?.config.chart?.ohlc ?? {});

  const resetSelection = useCallback(() => {
    setSelectedList(null);
    setCardFields([]);
    setTableFields([]);
    setChartValues([]);
    setXField(null);
    setOhlc({});
    setCardColumns({});
  }, []);

  const runTest = useCallback(
    async (target: string) => {
      const trimmed = target.trim();
      if (!trimmed) return;
      const seq = ++seqRef.current;
      setTest({ phase: 'testing' });
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(trimmed)}`, {
          cache: 'no-store',
        });
        const body: unknown = await res.json().catch(() => null);
        if (seq !== seqRef.current) return;
        if (!res.ok) {
          const b = body as { code?: unknown; error?: unknown } | null;
          const code =
            typeof b?.code === 'string' && b.code in FRIENDLY_ERRORS
              ? (b.code as ProxyErrorCode)
              : 'NETWORK';
          setTest({
            phase: 'fail',
            code,
            error: typeof b?.error === 'string' ? b.error : null,
          });
          return;
        }
        // Empty containers can't be mapped to a field — don't count them.
        const fields = flattenJson(body).filter(
          (f) => f.type !== 'object' && f.type !== 'array',
        ).length;
        const lists = findArrays(body).length;
        // New payload — old picks may no longer exist. But when editing,
        // re-testing the widget's own endpoint keeps its selections.
        if (trimmed !== editing?.config.endpoint) resetSelection();
        if (
          mode === 'card' &&
          cardType === 'watchlist' &&
          watchlistSource === 'symbols'
        ) {
          seedSymbolColumns(body);
        }
        setTest({ phase: 'ok', url: trimmed, data: body, fields, lists });
      } catch {
        if (seq !== seqRef.current) return;
        setTest({ phase: 'fail', code: 'NETWORK', error: null });
      }
    },
    [resetSelection, editing, mode, cardType, watchlistSource],
  );

  // A URL (prefill or a saved widget's endpoint) is tested once on open.
  const didAutoTest = useRef(false);
  useEffect(() => {
    const initial = editing?.config.endpoint ?? initialUrl;
    if (initial && !didAutoTest.current) {
      didAutoTest.current = true;
      void runTest(initial);
    }
  }, [initialUrl, editing, runTest]);

  // Esc closes; Tab cycles inside the panel (focus trap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const leaving = e.shiftKey
        ? active === first || !panel.contains(active)
        : active === last || !panel.contains(active);
      if (leaving) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [close]);

  /* ---- validation ---- */

  const errors = useMemo<Errors>(() => {
    const e: Errors = {};
    if (!title.trim()) e.name = 'Name the widget.';
    if (!url.trim()) e.url = 'Enter an API URL.';
    else if (test.phase === 'testing') e.url = 'Wait for the test to finish.';
    else if (test.phase === 'idle') e.url = 'Run Test to check the connection.';
    else if (test.phase === 'fail') e.url = 'The test failed — fix the URL.';
    if (mode === 'card') {
      const listBack = cardType === 'movers' || watchlistSource === 'list';
      if (cardType === 'financial' || cardType === 'performance') {
        if (cardFields.length === 0) e.fields = 'Add at least one field.';
      } else if (listBack && !selectedList) {
        e.fields = 'Pick a list first.';
      } else if (!listBack && symbols.length === 0) {
        e.fields = 'Add at least one symbol.';
      } else if (!cardColumns.price && !cardColumns.change) {
        e.fields = 'Map at least a price or change column.';
      }
    }
    if (mode === 'table') {
      if (!selectedList) e.fields = 'Pick a list first.';
      else if (tableFields.length === 0) e.fields = 'Add at least one column.';
    }
    if (mode === 'chart') {
      if (!selectedList) e.fields = 'Pick a list first.';
      else if (!xField) e.fields = 'Pick the X-axis field.';
      else if (
        chartType === 'candle'
          ? !(ohlc.open && ohlc.high && ohlc.low && ohlc.close)
          : chartValues.length === 0
      ) {
        e.fields =
          chartType === 'candle'
            ? 'Map open, high, low and close.'
            : 'Add at least one value field.';
      }
    }
    if (!Number.isFinite(refreshSec) || refreshSec < MIN_REFRESH_SEC) {
      e.refresh = `Use at least ${MIN_REFRESH_SEC} seconds.`;
    }
    return e;
  }, [
    title,
    url,
    test,
    mode,
    selectedList,
    cardFields,
    tableFields,
    chartType,
    chartValues,
    ohlc,
    xField,
    refreshSec,
    cardType,
    watchlistSource,
    symbols,
    cardColumns,
  ]);
  const firstError = errors.name ?? errors.url ?? errors.fields ?? errors.refresh;

  /* ---- handlers ---- */

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runTest(url);
  }

  function pickExample(exampleUrl: string) {
    setUrl(exampleUrl);
    setTest({ phase: 'idle' });
  }

  /** Pick a list — resets row picks, seeds chart + card-column guesses. */
  function onSelectList(list: ArrayInfo | null) {
    setSelectedList(list);
    setTableFields([]);
    setChartValues([]);
    setXField(null);
    setOhlc({});
    setCardColumns({});
    if (!list || test.phase !== 'ok') return;
    const keys = columnsForRows(rowsAtPath(test.data, list.path)).map(
      (c) => c.key,
    );
    const g = guessOhlcFields(keys);
    setXField(g.date ?? null);
    setOhlc({ open: g.open, high: g.high, low: g.low, close: g.close });
    if (mode === 'card') setCardColumns(guessListColumns(keys));
  }

  /**
   * Seed the quote-field column map for symbol watchlists — only when
   * nothing is mapped yet, so user edits and edit-mode prefill survive.
   * Called from the three events that can need it (test-ok, card-type
   * switch, source switch).
   */
  function seedSymbolColumns(data: unknown) {
    setCardColumns((c) =>
      c.name || c.price || c.change
        ? c
        : guessListColumns(flattenJson(data).map((f) => f.path)),
    );
  }

  /** Switch card type or watchlist source — column guesses go stale. */
  function onCardType(t: CardType) {
    setCardType(t);
    setCardColumns({});
    if (t === 'watchlist' && watchlistSource === 'symbols' && test.phase === 'ok') {
      seedSymbolColumns(test.data);
    }
  }
  function onWatchlistSource(src: WatchlistSource) {
    setWatchlistSource(src);
    setCardColumns({});
    if (src === 'symbols' && cardType === 'watchlist' && test.phase === 'ok') {
      seedSymbolColumns(test.data);
    }
  }

  function onChartType(kind: ChartKind) {
    setChartType(kind);
    if (kind === 'candle') {
      // Fill only unmapped slots — never clobber the user's picks.
      const g = guessOhlcFields(columns.map((c) => c.key));
      setOhlc((o) => ({
        open: o.open ?? g.open,
        high: o.high ?? g.high,
        low: o.low ?? g.low,
        close: o.close ?? g.close,
      }));
    }
  }

  /** "+" in the explorer — meaning depends on mode/chart type. */
  function onPick(key: string) {
    if (mode === 'card') {
      if (cardFields.some((f) => f.path === key)) return;
      setCardFields((fs) => [
        ...fs,
        { path: key, label: prettifyKey(lastPathSegment(key)), format: 'auto' },
      ]);
    } else if (mode === 'table') {
      if (tableFields.some((f) => f.path === key)) return;
      setTableFields((fs) => [
        ...fs,
        { path: key, label: prettifyKey(key), format: 'auto' },
      ]);
    } else if (chartType === 'candle') {
      // In candle mode "+" fills the first unmapped OHLC slot.
      const slot = OHLC_ROLES.find((s) => !ohlc[s]);
      if (slot) setOhlc((o) => ({ ...o, [slot]: key }));
    } else {
      if (chartValues.some((f) => f.path === key)) return;
      setChartValues((fs) => [
        ...fs,
        { path: key, label: prettifyKey(key), format: 'auto' },
      ]);
    }
  }

  function save() {
    setTried(true);
    if (firstError) return;
    const endpoint = url.trim();
    const cardKind: CardKind =
      cardType === 'performance'
        ? 'performance'
        : cardType === 'movers'
          ? moversDir
          : cardType === 'watchlist'
            ? 'watchlist'
            : 'financials';
    const config: Partial<WidgetConfig> = {
      title: title.trim(),
      provider: detectProvider(endpoint),
      endpoint,
      params: {},
      refreshIntervalSec: Math.max(MIN_REFRESH_SEC, Math.floor(refreshSec)),
      card:
        mode === 'card'
          ? {
              kind: cardKind,
              symbols: cardSymbolsMode ? symbols : [],
              listPath: cardListMode ? selectedList?.path : undefined,
              columns:
                cardListMode || cardSymbolsMode
                  ? (Object.fromEntries(
                      Object.entries(cardColumns).filter(([, v]) => !!v),
                    ) as CardColumnMap)
                  : undefined,
            }
          : undefined,
      table:
        mode === 'table'
          ? { listPath: selectedList?.path, pageSize: 10, sortDir: 'asc' }
          : undefined,
      chart:
        mode === 'chart'
          ? {
              kind: chartType,
              interval: 'daily',
              listPath: selectedList?.path,
              xField: xField ?? undefined,
              ohlc: chartType === 'candle' ? ohlc : undefined,
            }
          : undefined,
      // Candle keeps its mapped columns as fields so config.fields stays
      // meaningful; the role mapping itself lives in chart.ohlc.
      fields:
        mode === 'card'
          ? cardFieldsMode
            ? cardFields
            : []
          : mode === 'table'
            ? tableFields
            : chartType === 'candle'
              ? OHLC_ROLES.filter((r) => ohlc[r]).map((r) => ({
                  path: ohlc[r]!,
                  label: r[0].toUpperCase() + r.slice(1),
                  format: 'auto' as const,
                }))
              : chartValues,
    };
    if (editing) {
      updateWidgetConfig(editing.id, config);
      closeWidgetEditor();
    } else {
      addWidget(mode, { config });
      closeAddWidget();
    }
  }

  /* ---- derived render data ---- */

  /** Card-type → which picker UI is active. */
  const cardFieldsMode =
    mode === 'card' &&
    (cardType === 'financial' || cardType === 'performance');
  const cardListMode =
    mode === 'card' &&
    (cardType === 'movers' ||
      (cardType === 'watchlist' && watchlistSource === 'list'));
  const cardSymbolsMode =
    mode === 'card' && cardType === 'watchlist' && watchlistSource === 'symbols';

  const listRows =
    test.phase === 'ok' && selectedList
      ? rowsAtPath(test.data, selectedList.path)
      : [];
  const columns = columnsForRows(listRows);

  const lists = useMemo(
    () => (test.phase === 'ok' && cardListMode ? findArrays(test.data) : []),
    [test, cardListMode],
  );
  const leafKeys = useMemo(
    () =>
      test.phase === 'ok'
        ? flattenJson(test.data)
            .filter((f) => f.type !== 'object' && f.type !== 'array')
            .map((f) => f.path)
        : [],
    [test],
  );
  const suggestedPaths = useMemo(
    () =>
      test.phase === 'ok' && cardType === 'performance'
        ? suggestPerformanceFields(leafKeys.map((path) => ({ path })))
        : [],
    [test, cardType, leafKeys],
  );

  const addedKeys = useMemo(() => {
    if (mode === 'card') return new Set(cardFields.map((f) => f.path));
    if (mode === 'table') return new Set(tableFields.map((f) => f.path));
    if (chartType === 'candle') {
      return new Set(
        OHLC_ROLES.map((r) => ohlc[r]).filter((k): k is string => !!k),
      );
    }
    return new Set(chartValues.map((f) => f.path));
  }, [mode, cardFields, tableFields, chartType, chartValues, ohlc]);

  /* ---- render ---- */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit widget' : 'Add widget'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] sm:p-4"
      onClick={close}
    >
      <div
        ref={panelRef}
        className={`flex h-full w-full flex-col bg-surface transition-[max-width] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-subtle sm:shadow-xl ${
          test.phase === 'ok' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6">
          <h2 className="font-display text-2xl">
            {isEdit ? 'Edit widget' : 'Add widget'}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <label
            htmlFor="widget-api-url"
            className="mt-5 block text-xs font-medium uppercase tracking-wide text-muted"
          >
            API URL
          </label>
          <form onSubmit={onSubmit} className="mt-2 flex items-center gap-2">
            <input
              id="widget-api-url"
              type="text"
              inputMode="url"
              autoFocus
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTest({ phase: 'idle' });
              }}
              placeholder="https://api.example.com/quote?symbol=AAPL"
              className="min-w-0 flex-1 rounded-lg border border-subtle bg-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={!url.trim() || test.phase === 'testing'}
              className="flex min-w-16 shrink-0 items-center justify-center rounded-lg border border-subtle bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-strong disabled:pointer-events-none disabled:opacity-50"
            >
              {test.phase === 'testing' ? (
                <Loader2 className="size-4 animate-spin" aria-label="Testing" />
              ) : (
                'Test'
              )}
            </button>
          </form>
          {tried && errors.url && (
            <p className="mt-1.5 text-xs text-down">{errors.url}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-faint">Try</span>
            {EXAMPLE_APIS.map((ex) => (
              <button
                key={ex.url}
                type="button"
                onClick={() => pickExample(ex.url)}
                className="rounded-full border border-subtle bg-raised px-2.5 py-1 text-xs text-muted transition-colors hover:border-strong hover:text-ink"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {test.phase === 'ok' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-up/30 bg-up/10 px-3 py-2 text-sm text-up">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Connected · {test.fields}{' '}
                {test.fields === 1 ? 'field' : 'fields'} found
                {test.lists > 0 &&
                  ` · ${test.lists} ${test.lists === 1 ? 'list' : 'lists'} found`}
              </span>
            </div>
          )}
          {test.phase === 'fail' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-sm text-down">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p>{FRIENDLY_ERRORS[test.code]}</p>
                {test.error && test.error !== FRIENDLY_ERRORS[test.code] && (
                  <p className="mt-0.5 text-xs opacity-80">{test.error}</p>
                )}
              </div>
            </div>
          )}

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
            Display mode
          </p>
          <div
            role="tablist"
            aria-label="Display mode"
            title={isEdit ? 'Display mode can’t change on an existing widget' : undefined}
            className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-subtle bg-raised p-1"
          >
            {MODE_TABS.map((t) => (
              <button
                key={t.type}
                type="button"
                role="tab"
                aria-selected={mode === t.type}
                disabled={isEdit}
                onClick={() => setMode(t.type)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                  mode === t.type
                    ? 'bg-surface text-ink shadow-sm ring-1 ring-subtle'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === 'card' && (
            <>
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
                Card type
              </p>
              <div
                role="radiogroup"
                aria-label="Card type"
                className="mt-2 grid grid-cols-4 gap-1 rounded-full border border-subtle bg-raised p-1"
              >
                {CARD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={cardType === t.value}
                    onClick={() => onCardType(t.value)}
                    className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${
                      cardType === t.value
                        ? 'bg-surface text-ink shadow-sm ring-1 ring-subtle'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {cardType === 'movers' && (
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="text-xs text-muted">Show</span>
                  <PillRow
                    ariaLabel="Movers direction"
                    options={[
                      { value: 'gainers', label: 'Gainers' },
                      { value: 'losers', label: 'Losers' },
                    ]}
                    value={moversDir}
                    onChange={setMoversDir}
                  />
                  <span className="text-[11px] text-faint">
                    {moversDir === 'gainers' ? 'biggest gains first' : 'biggest losses first'}
                  </span>
                </div>
              )}

              {cardType === 'watchlist' && (
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="text-xs text-muted">Source</span>
                  <PillRow
                    ariaLabel="Watchlist source"
                    options={WATCHLIST_SOURCES}
                    value={watchlistSource}
                    onChange={onWatchlistSource}
                  />
                </div>
              )}
            </>
          )}

          {test.phase === 'ok' && (
            <>
              {mode === 'card' &&
                cardType === 'performance' &&
                suggestedPaths.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-faint">Suggested</span>
                    {suggestedPaths.map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={addedKeys.has(p)}
                        onClick={() => onPick(p)}
                        title={p}
                        className="rounded-full border border-subtle bg-raised px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                      >
                        {prettifyKey(lastPathSegment(p))}
                      </button>
                    ))}
                  </div>
                )}

              {cardSymbolsMode ? (
                <>
                  <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
                    Watchlist symbols
                  </p>
                  <SymbolsInput symbols={symbols} onChange={setSymbols} />
                  <p className="mt-2 text-[11px] text-faint">
                    One quote request per symbol — each is cached and
                    refreshed on the widget’s interval.
                  </p>
                </>
              ) : cardListMode ? (
                <>
                  <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
                    Rows list
                  </p>
                  {selectedList ? (
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
                        {listRows.length} {listRows.length === 1 ? 'row' : 'rows'}
                      </span>
                    </div>
                  ) : (
                    <ListPicker lists={lists} onSelect={onSelectList} />
                  )}
                </>
              ) : (
                <JsonExplorer
                  mode={mode}
                  data={test.data}
                  selectedList={selectedList}
                  onSelectList={onSelectList}
                  addedKeys={addedKeys}
                  onAdd={onPick}
                />
              )}

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Selected fields
                </p>
                {tried && errors.fields && (
                  <p className="text-xs normal-case text-down">{errors.fields}</p>
                )}
              </div>
              {mode === 'card' && cardFieldsMode && (
                <FieldList fields={cardFields} onChange={setCardFields} />
              )}
              {mode === 'card' && cardListMode &&
                (selectedList ? (
                  <CardColumnFields
                    options={columns.map((c) => c.key)}
                    value={cardColumns}
                    onChange={setCardColumns}
                  />
                ) : (
                  <p className="mt-2 text-xs text-faint">
                    Pick a list above, then map its columns.
                  </p>
                ))}
              {mode === 'card' && cardSymbolsMode && (
                <CardColumnFields
                  options={leafKeys}
                  value={cardColumns}
                  onChange={setCardColumns}
                  nameIsSymbol
                />
              )}
              {mode === 'table' &&
                (selectedList ? (
                  <FieldList fields={tableFields} onChange={setTableFields} />
                ) : (
                  <p className="mt-2 text-xs text-faint">
                    Pick a list above, then add its columns.
                  </p>
                ))}
              {mode === 'chart' &&
                (selectedList ? (
                  <ChartFields
                    columns={columns}
                    chartType={chartType}
                    onChartType={onChartType}
                    xField={xField}
                    onXField={setXField}
                    values={chartValues}
                    onValues={setChartValues}
                    ohlc={ohlc}
                    onOhlc={setOhlc}
                  />
                ) : (
                  <p className="mt-2 text-xs text-faint">
                    Pick a list above to map chart fields.
                  </p>
                ))}
            </>
          )}

          <div className="mt-6 flex items-start gap-3 pb-4">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="widget-name"
                className="block text-xs font-medium uppercase tracking-wide text-muted"
              >
                Name
              </label>
              <input
                id="widget-name"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    save();
                  }
                }}
                placeholder="e.g. AAPL quote"
                className="mt-2 w-full rounded-lg border border-subtle bg-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              {tried && errors.name && (
                <p className="mt-1 text-xs text-down">{errors.name}</p>
              )}
            </div>
            <div className="w-28 shrink-0">
              <label
                htmlFor="widget-refresh"
                className="block text-xs font-medium uppercase tracking-wide text-muted"
              >
                Refresh (s)
              </label>
              <input
                id="widget-refresh"
                type="number"
                min={MIN_REFRESH_SEC}
                value={refreshSec}
                onChange={(e) => setRefreshSec(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-subtle bg-raised px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
              {tried && errors.refresh && (
                <p className="mt-1 text-xs text-down">{errors.refresh}</p>
              )}
            </div>
          </div>
        </div>

        {/* sticky footer */}
        <div className="shrink-0 border-t border-subtle bg-surface px-6 py-4 sm:rounded-b-2xl">
          <div className="flex items-center justify-end gap-2">
            {tried && firstError && (
              <p className="mr-auto truncate text-xs text-down">{firstError}</p>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              {isEdit ? 'Save changes' : 'Add widget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small segmented pill group used by the card-type sub-toggles. */
function PillRow<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex gap-1 rounded-full border border-subtle bg-raised p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-surface text-ink shadow-sm ring-1 ring-subtle'
              : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
