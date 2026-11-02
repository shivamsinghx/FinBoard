import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { NextRequest } from 'next/server';
import type { CacheStatus, ProxyErrorBody, ProxyErrorCode } from '@/types/api';

/**
 * GET /api/proxy?url=<encoded URL>&ttl=<seconds>
 *
 * Relays a widget's request to an external finance API:
 * - only public http(s) hosts (blocks localhost / private / link-local IPs,
 *   re-checked on every redirect hop)
 * - injects provider API keys server-side so they never reach the browser
 * - caches successful JSON in memory per URL (default 30s, `ttl=0` bypasses)
 * - normalizes failures to `{ error, code }`
 */

const TIMEOUT_MS = 10_000;
const DEFAULT_TTL_SEC = 30;
const MAX_TTL_SEC = 3600;
const MAX_CACHE_ENTRIES = 500;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

const STATUS: Record<ProxyErrorCode, number> = {
  RATE_LIMIT: 429,
  INVALID_KEY: 401,
  NOT_FOUND: 404,
  NETWORK: 502,
  TIMEOUT: 504,
  BAD_RESPONSE: 502,
  INVALID_URL: 400,
};

/** Hosts whose key we add when the URL doesn't carry one. */
const KEYED_HOSTS = [
  { host: 'finnhub.io', param: 'token', env: 'FINNHUB_API_KEY' },
  { host: 'alphavantage.co', param: 'apikey', env: 'ALPHA_VANTAGE_API_KEY' },
] as const;

type Failure = ProxyErrorBody & { ok: false };
type Result = { ok: true; data: unknown } | Failure;

const fail = (code: ProxyErrorCode, error: string): Failure => ({ ok: false, code, error });

/* ------------------------------------------------------------------ */
/* Cache (on globalThis so dev HMR doesn't wipe it)                    */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  at: number;
  data: unknown;
}

const g = globalThis as typeof globalThis & {
  __finboardProxyCache?: Map<string, CacheEntry>;
  __finboardProxyInflight?: Map<string, Promise<Result>>;
};
const cache = (g.__finboardProxyCache ??= new Map());
const inflight = (g.__finboardProxyInflight ??= new Map());

function remember(key: string, data: unknown) {
  cache.delete(key);
  cache.set(key, { at: Date.now(), data });
  for (const [k, v] of cache) {
    if (cache.size <= MAX_CACHE_ENTRIES && Date.now() - v.at < MAX_TTL_SEC * 1000) break;
    cache.delete(k);
  }
}

/* ------------------------------------------------------------------ */
/* SSRF guard                                                          */
/* ------------------------------------------------------------------ */

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^(?:0{0,4}:){0,5}:?ffff:(.+)$/);
  if (mapped) {
    const rest = mapped[1];
    if (rest.includes('.')) return isPrivateIp(rest);
    const [hi, lo] = rest.split(':').map((h) => parseInt(h, 16));
    return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const first = parseInt(v6.split(':')[0] || '0', 16);
  return (
    first === 0 || // ::, ::1, IPv4-compatible
    (first & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (first & 0xffc0) === 0xfec0 || // site-local fec0::/10
    (first & 0xff00) === 0xff00 || // multicast
    v6.startsWith('64:ff9b:') // NAT64 → could map to private v4
  );
}

async function checkTarget(url: URL): Promise<Failure | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail('INVALID_URL', 'Only http and https URLs are allowed.');
  }
  if (url.username || url.password) {
    return fail('INVALID_URL', 'URLs with embedded credentials are not allowed.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
  const blocked = fail('INVALID_URL', 'Requests to local or private network addresses are blocked.');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return blocked;
  }
  if (isIP(host)) return isPrivateIp(host) ? blocked : null;
  try {
    const addrs = await lookup(host, { all: true, verbatim: true });
    return addrs.some((a) => isPrivateIp(a.address)) ? blocked : null;
  } catch {
    return fail('NETWORK', `Could not resolve host "${host}".`);
  }
}

/* ------------------------------------------------------------------ */
/* Upstream call                                                       */
/* ------------------------------------------------------------------ */

const matchesHost = (hostname: string, host: string) =>
  hostname === host || hostname.endsWith(`.${host}`);

/** Returns the URL to fetch plus any secrets added, for redaction. */
function withApiKey(url: URL): { target: URL; secrets: string[] } {
  const target = new URL(url);
  const secrets: string[] = [];
  for (const { host, param, env } of KEYED_HOSTS) {
    const key = process.env[env];
    if (matchesHost(target.hostname, host) && !target.searchParams.get(param) && key) {
      target.searchParams.set(param, key);
      secrets.push(key);
    }
  }
  return { target, secrets };
}

function upstreamMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  const msg = [o.error, o.message, o['Error Message']].find((v) => typeof v === 'string');
  return typeof msg === 'string' ? msg.slice(0, 300) : null;
}

/** Alpha Vantage answers HTTP 200 with a `Note`/`Information` body when throttled. */
function alphaVantageError(data: unknown): Failure | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  if (typeof o.Note === 'string') return fail('RATE_LIMIT', o.Note);
  if (typeof o.Information === 'string') {
    const info = o.Information;
    if (/rate limit|requests per|call frequency/i.test(info)) return fail('RATE_LIMIT', info);
    if (/premium|api ?key/i.test(info)) return fail('INVALID_KEY', info);
    return fail('RATE_LIMIT', info);
  }
  if (typeof o['Error Message'] === 'string') {
    const msg = o['Error Message'];
    return fail(/api ?key/i.test(msg) ? 'INVALID_KEY' : 'BAD_RESPONSE', msg);
  }
  return null;
}

async function fetchUpstream(url: URL): Promise<Result> {
  const { target, secrets } = withApiKey(url);
  const redact = (s: string) => secrets.reduce((acc, k) => acc.split(k).join('***'), s);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = target;

  try {
    for (let hop = 0; ; hop++) {
      const blocked = await checkTarget(current);
      if (blocked) return blocked;

      const res = await fetch(current, {
        redirect: 'manual',
        signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        if (hop >= MAX_REDIRECTS) return fail('BAD_RESPONSE', 'Too many redirects.');
        current = new URL(location, current);
        continue;
      }

      if (Number(res.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
        return fail('BAD_RESPONSE', 'Response is too large.');
      }
      const text = await res.text();
      if (text.length > MAX_BODY_BYTES) return fail('BAD_RESPONSE', 'Response is too large.');

      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = undefined;
      }

      if (!res.ok) {
        const code: ProxyErrorCode =
          res.status === 429
            ? 'RATE_LIMIT'
            : res.status === 401 || res.status === 403
              ? 'INVALID_KEY'
              : res.status === 404
                ? 'NOT_FOUND'
                : 'BAD_RESPONSE';
        const msg = upstreamMessage(data) ?? `Upstream API responded with HTTP ${res.status}.`;
        return fail(code, redact(msg));
      }
      if (data === undefined) return fail('BAD_RESPONSE', 'Upstream API did not return valid JSON.');

      if (matchesHost(current.hostname, 'alphavantage.co')) {
        const avError = alphaVantageError(data);
        if (avError) return { ...avError, error: redact(avError.error) };
      }
      return { ok: true, data };
    }
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return fail('TIMEOUT', `Upstream API did not respond within ${TIMEOUT_MS / 1000}s.`);
    }
    return fail('NETWORK', 'Could not reach the upstream API.');
  }
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

function reply(result: Result, cacheStatus: CacheStatus, ageSec = 0) {
  const headers = { 'X-Cache': cacheStatus, 'X-Cache-Age': String(ageSec), 'Cache-Control': 'no-store' };
  if (result.ok) return Response.json(result.data, { headers });
  const body: ProxyErrorBody = { error: result.error, code: result.code };
  return Response.json(body, { status: STATUS[result.code], headers });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const raw = params.get('url');
  if (!raw) return reply(fail('INVALID_URL', 'Missing "url" query parameter.'), 'MISS');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return reply(fail('INVALID_URL', 'The "url" parameter is not a valid URL.'), 'MISS');
  }
  url.hash = '';

  const ttlParam = Number.parseInt(params.get('ttl') ?? '', 10);
  const ttlSec = Number.isNaN(ttlParam)
    ? DEFAULT_TTL_SEC
    : Math.min(Math.max(ttlParam, 0), MAX_TTL_SEC);

  const key = url.href;
  const hit = cache.get(key);
  if (ttlSec > 0 && hit && Date.now() - hit.at < ttlSec * 1000) {
    return reply({ ok: true, data: hit.data }, 'HIT', Math.floor((Date.now() - hit.at) / 1000));
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchUpstream(url).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const result = await pending;
  if (result.ok && ttlSec > 0) remember(key, result.data);
  return reply(result, 'MISS');
}
