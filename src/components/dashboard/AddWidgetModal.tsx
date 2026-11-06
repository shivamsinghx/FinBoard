'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { findArrays, flattenJson } from '@/lib/jsonPaths';
import type { ProxyErrorCode } from '@/types/api';
import type { WidgetType } from '@/types/widget';

const MODE_TABS: { type: WidgetType; label: string }[] = [
  { type: 'card', label: 'Card' },
  { type: 'table', label: 'Table' },
  { type: 'chart', label: 'Chart' },
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
    label: 'Finnhub · AAPL candles',
    url: 'https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1704067200&to=1735689600',
  },
  {
    label: 'Alpha Vantage · IBM daily',
    url: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo',
  },
];

const FRIENDLY_ERRORS: Record<ProxyErrorCode, string> = {
  RATE_LIMIT: 'API limit reached, try again in a minute.',
  INVALID_KEY: 'API key was rejected — check the key in the URL or your .env.',
  NOT_FOUND: 'Endpoint not found — check the URL path.',
  TIMEOUT: 'The API took too long to respond — try again.',
  NETWORK: 'Couldn’t reach the API — check the URL and your connection.',
  BAD_RESPONSE: 'The API returned an unexpected response.',
  INVALID_URL: 'That URL isn’t allowed — it must be a public http(s) address.',
};

/** Result of the one-shot "Test" call — kept for the field picker (stage 2). */
type TestState =
  | { phase: 'idle' }
  | { phase: 'testing' }
  | { phase: 'ok'; url: string; data: unknown; fields: number; lists: number }
  | { phase: 'fail'; code: ProxyErrorCode; error: string | null };

export function AddWidgetModal() {
  const open = useDashboardStore((s) => s.addWidgetOpen);
  const prefill = useDashboardStore((s) => s.addWidgetPrefill);

  if (!open) return null;
  return <ModalPanel initialUrl={prefill} />;
}

/** Mounted only while the modal is open, so state resets per open. */
function ModalPanel({ initialUrl }: { initialUrl: string }) {
  const closeAddWidget = useDashboardStore((s) => s.closeAddWidget);
  const [url, setUrl] = useState(initialUrl);
  const [test, setTest] = useState<TestState>({ phase: 'idle' });
  const [mode, setMode] = useState<WidgetType>('card');
  /** Guards against stale responses and StrictMode double-effects. */
  const seqRef = useRef(0);

  const runTest = useCallback(async (target: string) => {
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
      setTest({ phase: 'ok', url: trimmed, data: body, fields, lists });
    } catch {
      if (seq !== seqRef.current) return;
      setTest({ phase: 'fail', code: 'NETWORK', error: null });
    }
  }, []);

  // A URL passed in from the hero/nav composer is pre-filled and tested once.
  const didAutoTest = useRef(false);
  useEffect(() => {
    if (initialUrl && !didAutoTest.current) {
      didAutoTest.current = true;
      void runTest(initialUrl);
    }
  }, [initialUrl, runTest]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAddWidget();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAddWidget]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runTest(url);
  }

  function pickExample(exampleUrl: string) {
    setUrl(exampleUrl);
    setTest({ phase: 'idle' });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add widget"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={closeAddWidget}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl">Add widget</h2>
          <button
            type="button"
            onClick={closeAddWidget}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

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
              Connected · {test.fields} {test.fields === 1 ? 'field' : 'fields'} found
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
          className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-subtle bg-raised p-1"
        >
          {MODE_TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              role="tab"
              aria-selected={mode === t.type}
              onClick={() => setMode(t.type)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                mode === t.type
                  ? 'bg-surface text-ink shadow-sm ring-1 ring-subtle'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
