/**
 * Docs section registry — shared by the /docs table of contents, the
 * page search box and the header command palette ("Docs: …" items).
 */
export interface DocSectionMeta {
  id: string;
  title: string;
  /** Extra terms the search box and palette filter match on. */
  keywords: string[];
}

export const DOC_SECTIONS: DocSectionMeta[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    keywords: ['quick', 'start', 'how it works', 'template', 'first widget'],
  },
  {
    id: 'supported-apis',
    title: 'Supported APIs',
    keywords: [
      'finnhub',
      'alpha vantage',
      'coinbase',
      'cryptocompare',
      'indianapi',
      'endpoint',
      'url',
      'provider',
    ],
  },
  {
    id: 'api-keys',
    title: 'API keys & security',
    keywords: ['key', 'env', 'proxy', 'secret', 'security', 'finnhub_api_key'],
  },
  {
    id: 'widget-types',
    title: 'Widget types',
    keywords: ['card', 'table', 'chart', 'candle', 'watchlist', 'ohlc', 'fields'],
  },
  {
    id: 'formatting',
    title: 'Formatting playground',
    keywords: ['format', 'currency', 'percent', 'date', 'number', 'inr', 'usd'],
  },
  {
    id: 'refresh-caching',
    title: 'Refresh, caching & rate limits',
    keywords: [
      'refresh',
      'interval',
      'cache',
      'rate limit',
      'stale',
      'polling',
      'watchlist',
    ],
  },
  {
    id: 'export-templates',
    title: 'Export, import & templates',
    keywords: ['export', 'import', 'backup', 'json', 'template', 'restore'],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    keywords: ['keyboard', 'shortcut', 'ctrl', 'cmd', 'palette', 'esc', 'enter'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    keywords: [
      'error',
      'rate_limit',
      'invalid_key',
      'invalid_url',
      'not_found',
      'timeout',
      'network',
      'bad_response',
      'fix',
    ],
  },
];

/** URL-friendly anchor for a proxy error code: RATE_LIMIT -> error-rate-limit */
export function docErrorSlug(code: string): string {
  return `error-${code.toLowerCase().replace(/_/g, '-')}`;
}
