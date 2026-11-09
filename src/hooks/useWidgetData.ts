'use client';

import { useCallback, useEffect, useReducer, useSyncExternalStore } from 'react';
import type { ProxyErrorCode } from '@/types/api';

/**
 * Data-fetching hook for dashboard widgets.
 *
 * All requests go through `/api/proxy` (keys stay server-side, upstream
 * responses cached). A module-level cache keyed by URL is shared by every
 * widget: concurrent requests for the same URL are de-duplicated into a
 * single fetch, and a widget mounted on a URL another widget already
 * fetched renders the cached payload immediately.
 *
 * Polling honors `document.visibilityState` — timers are suspended while
 * the tab is hidden and the widget re-fetches on return. Errors never
 * clear the last good payload, so a `RATE_LIMIT` (or any failure) keeps
 * stale data on screen next to the error; rate-limited URLs retry on a
 * fixed 60s cadence instead of the widget's own interval.
 */

export type WidgetDataStatus = 'loading' | 'success' | 'error' | 'empty';

export interface WidgetDataResult {
  /** Last successful payload — retained across later errors. */
  data: unknown;
  status: WidgetDataStatus;
  error: string | null;
  errorCode: ProxyErrorCode | null;
  /** ms timestamp of the last successful fetch. */
  lastUpdated: number | null;
  /** True while any request for this URL is in flight (incl. refetches). */
  isFetching: boolean;
  /** Re-fetch now and restart the poll timer. */
  refetch: () => void;
}

/** Retry cadence for rate-limited URLs, independent of widget interval. */
const RATE_LIMIT_RETRY_MS = 60_000;

/* ------------------------------------------------------------------ */
/* Shared cache + de-duplication                                        */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  data: unknown;
  hasData: boolean;
  error: string | null;
  code: ProxyErrorCode | null;
  /** ms timestamp of the last successful fetch. */
  at: number | null;
  /** In-flight request shared by all subscribers of this URL. */
  inflight: Promise<void> | null;
  listeners: Set<() => void>;
  /** Bumped on every mutation so useSyncExternalStore sees a new snapshot. */
  version: number;
}

const entries = new Map<string, CacheEntry>();

function entryFor(url: string): CacheEntry {
  let e = entries.get(url);
  if (!e) {
    e = {
      data: undefined,
      hasData: false,
      error: null,
      code: null,
      at: null,
      inflight: null,
      listeners: new Set(),
      version: 0,
    };
    entries.set(url, e);
  }
  return e;
}

function notify(e: CacheEntry): void {
  e.version++;
  e.listeners.forEach((l) => l());
}

type Outcome =
  | { ok: true; data: unknown }
  | { ok: false; error: string; code: ProxyErrorCode };

async function fetchViaProxy(url: string): Promise<Outcome> {
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      cache: 'no-store',
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const b = body as Partial<{ error: string; code: ProxyErrorCode }> | null;
      return {
        ok: false,
        error:
          typeof b?.error === 'string'
            ? b.error
            : `Request failed (HTTP ${res.status}).`,
        code:
          typeof b?.code === 'string' && isProxyCode(b.code)
            ? b.code
            : 'NETWORK',
      };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: 'Could not reach the server.', code: 'NETWORK' };
  }
}

const PROXY_CODES: readonly ProxyErrorCode[] = [
  'RATE_LIMIT',
  'INVALID_KEY',
  'NOT_FOUND',
  'NETWORK',
  'TIMEOUT',
  'BAD_RESPONSE',
  'INVALID_URL',
];
const isProxyCode = (v: string): v is ProxyErrorCode =>
  (PROXY_CODES as readonly string[]).includes(v);

/**
 * Fetch `url` through the proxy, updating the shared entry. Concurrent
 * callers join the same in-flight request — this is what makes two
 * widgets on one URL issue a single network call.
 */
function request(url: string): Promise<void> {
  const e = entryFor(url);
  if (e.inflight) return e.inflight;
  const p = fetchViaProxy(url)
    .then((r) => {
      if (r.ok) {
        e.data = r.data;
        e.hasData = true;
        e.at = Date.now();
        e.error = null;
        e.code = null;
      } else {
        // Deliberately keep e.data/e.at — the last good payload stays on
        // screen next to the error.
        e.error = r.error;
        e.code = r.code;
      }
    })
    .finally(() => {
      e.inflight = null;
      notify(e);
    });
  e.inflight = p;
  notify(e); // flip isFetching true immediately — settles notify again
  return p;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */

/**
 * @param url External API URL for the widget; null/empty disables fetching.
 * @param refreshIntervalSec Poll cadence; <= 0 disables polling (the
 *   initial fetch still runs).
 */
export function useWidgetData(
  url: string | null | undefined,
  refreshIntervalSec = 60,
): WidgetDataResult {
  const key = url && url.trim() ? url : null;

  // Re-render this component whenever its URL's entry mutates.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const e = entryFor(key);
      e.listeners.add(onChange);
      return () => {
        e.listeners.delete(onChange);
      };
    },
    [key],
  );
  const getVersion = useCallback(
    () => (key ? entryFor(key).version : -1),
    [key],
  );
  useSyncExternalStore(subscribe, getVersion, () => -1);

  // Initial fetch: on mount / URL change, fetch when there's nothing to
  // show or the shared cache is older than the poll interval.
  useEffect(() => {
    if (!key) return;
    const e = entryFor(key);
    const stale = e.at !== null && Date.now() - e.at > refreshIntervalSec * 1000;
    if ((!e.hasData || stale) && !e.inflight) void request(key);
  }, [key, refreshIntervalSec]);

  // Poll timer. `pollKey` is bumped by refetch() to restart the cadence.
  const [pollKey, resetPoll] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!key || refreshIntervalSec <= 0) return;
    const e = entryFor(key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const nextDelay = () =>
      e.code === 'RATE_LIMIT' ? RATE_LIMIT_RETRY_MS : refreshIntervalSec * 1000;
    const schedule = () => {
      if (alive && timer === undefined && document.visibilityState === 'visible') {
        timer = setTimeout(tick, nextDelay());
      }
    };
    const stop = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
    const tick = () => {
      timer = undefined;
      void request(key).finally(schedule);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        void request(key); // refresh whatever went stale while hidden
        schedule();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      alive = false;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [key, refreshIntervalSec, pollKey]);

  const refetch = useCallback(() => {
    if (!key) return;
    void request(key);
    resetPoll();
  }, [key]);

  const e = key ? entryFor(key) : null;
  const status: WidgetDataStatus = !e
    ? 'empty'
    : e.error
      ? 'error'
      : e.hasData
        ? 'success'
        : 'loading';

  return {
    data: e?.hasData ? e.data : undefined,
    status,
    error: e?.error ?? null,
    errorCode: e?.code ?? null,
    lastUpdated: e?.at ?? null,
    isFetching: e ? e.inflight !== null : false,
    refetch,
  };
}

/* ------------------------------------------------------------------ */
/* Internals (exported for unit tests)                                  */
/* ------------------------------------------------------------------ */

export const __widgetDataInternals = { entries, entryFor, request, RATE_LIMIT_RETRY_MS };
