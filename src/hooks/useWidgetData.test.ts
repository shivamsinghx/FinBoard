import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __widgetDataInternals } from './useWidgetData';

const { entries, entryFor, request } = __widgetDataInternals;

const URL_A = 'https://api.example.com/quote?symbol=AAPL';
const URL_B = 'https://api.example.com/quote?symbol=MSFT';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  entries.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request() — proxying', () => {
  it('fetches through /api/proxy with the URL encoded', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ price: 1 }));
    await request(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/proxy?url=${encodeURIComponent(URL_A)}`,
    );
  });

  it('caches the payload and timestamps the entry', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ price: 42 }));
    await request(URL_A);
    const e = entries.get(URL_A);
    expect(e?.hasData).toBe(true);
    expect(e?.data).toEqual({ price: 42 });
    expect(e?.at).toBeTypeOf('number');
    expect(e?.error).toBeNull();
  });
});

describe('request() — de-duplication', () => {
  it('joins concurrent calls into a single fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await Promise.all([request(URL_A), request(URL_A), request(URL_A)]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tracks different URLs independently', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await Promise.all([request(URL_A), request(URL_B)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(entries.has(URL_A)).toBe(true);
    expect(entries.has(URL_B)).toBe(true);
  });

  it('issues a new fetch once the previous one settles', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await request(URL_A);
    await request(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('request() — error handling', () => {
  it('surfaces proxy error bodies', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'slow down', code: 'RATE_LIMIT' }, 429),
    );
    await request(URL_A);
    const e = entries.get(URL_A);
    expect(e?.error).toBe('slow down');
    expect(e?.code).toBe('RATE_LIMIT');
    expect(e?.hasData).toBe(false);
  });

  it('keeps the last good data when a later fetch fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ price: 42 }));
    await request(URL_A);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'slow down', code: 'RATE_LIMIT' }, 429),
    );
    await request(URL_A);
    const e = entries.get(URL_A);
    expect(e?.data).toEqual({ price: 42 });
    expect(e?.hasData).toBe(true);
    expect(e?.error).toBe('slow down');
    expect(e?.code).toBe('RATE_LIMIT');
  });

  it('clears the error on the next success', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'boom', code: 'BAD_RESPONSE' }, 502),
    );
    await request(URL_A);
    fetchMock.mockResolvedValueOnce(jsonResponse({ price: 1 }));
    await request(URL_A);
    const e = entries.get(URL_A);
    expect(e?.error).toBeNull();
    expect(e?.code).toBeNull();
    expect(e?.data).toEqual({ price: 1 });
  });

  it('normalizes non-proxy failures to NETWORK', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('oops', 500));
    await request(URL_A);
    expect(entries.get(URL_A)?.code).toBe('NETWORK');
    expect(entries.get(URL_A)?.error).toContain('500');
  });

  it('maps thrown fetch errors to NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket hangup'));
    await request(URL_A);
    expect(entries.get(URL_A)?.code).toBe('NETWORK');
  });
});

describe('subscribers', () => {
  it('notifies listeners and bumps the version on settle', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const e = entryFor(URL_A);
    const v0 = e.version;
    const seen: number[] = [];
    e.listeners.add(() => seen.push(e.version));
    await request(URL_A);
    expect(seen).toEqual([v0 + 1]);
  });
});
