import type { ProxyErrorCode } from '@/types/api';

/** User-facing copy for each proxy error code — shared by the modal and widget shell. */
export const FRIENDLY_ERRORS: Record<ProxyErrorCode, string> = {
  RATE_LIMIT: 'API limit reached, try again in a minute.',
  INVALID_KEY: 'API key was rejected — check the key in the URL or your .env.',
  NOT_FOUND: 'Endpoint not found — check the URL path.',
  TIMEOUT: 'The API took too long to respond — try again.',
  NETWORK: 'Couldn’t reach the API — check the URL and your connection.',
  BAD_RESPONSE: 'The API returned an unexpected response.',
  INVALID_URL: 'That URL isn’t allowed — it must be a public http(s) address.',
};
