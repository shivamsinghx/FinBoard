/**
 * Contract for `/api/proxy` — the server-side relay every widget uses to
 * reach external finance APIs (keys injected server-side, responses cached).
 */

export type ProxyErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_KEY'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'BAD_RESPONSE'
  /** Request rejected before any upstream call (bad scheme, private host…). */
  | 'INVALID_URL';

export interface ProxyErrorBody {
  error: string;
  code: ProxyErrorCode;
}

export type CacheStatus = 'HIT' | 'MISS';
