import {
  WIDGET_GRID_DEFAULTS,
  type DashboardExport,
  type WidgetConfig,
  type WidgetInstance,
  type WidgetLayout,
  type WidgetType,
} from '@/types/widget';

/**
 * Prebuilt dashboards as full DashboardExport payloads — loading one is
 * exactly an import, so it goes through the same validation path.
 * Endpoints are limited to what the proxy can serve: Coinbase spot and
 * CryptoCompare (keyless), Finnhub + Alpha Vantage (key injected
 * server-side, or AV's demo key where it works).
 */

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  payload: DashboardExport;
}

const T0 = '2026-01-01T00:00:00.000Z';

function w(
  id: string,
  type: WidgetType,
  pos: Pick<WidgetLayout, 'x' | 'y'> & Partial<WidgetLayout>,
  config: WidgetConfig,
): WidgetInstance {
  return {
    id,
    type,
    layout: {
      w: WIDGET_GRID_DEFAULTS[type].w,
      h: WIDGET_GRID_DEFAULTS[type].h,
      ...pos,
    },
    config,
    createdAt: T0,
  };
}

function exportOf(widgets: WidgetInstance[]): DashboardExport {
  return { version: 2, exportedAt: T0, widgets };
}

/* ------------------------------------------------------------------ */
/* Shared config bits                                                  */
/* ------------------------------------------------------------------ */

const base = (
  provider: WidgetConfig['provider'],
  endpoint: string,
  title: string,
  fields: WidgetConfig['fields'] = [],
  refreshIntervalSec = 60,
): WidgetConfig => ({
  title,
  provider,
  endpoint,
  params: {},
  fields,
  refreshIntervalSec,
});

const F = (path: string, label: string, format: WidgetConfig['fields'][number]['format'] = 'auto') => ({
  path,
  label,
  format,
});

/** Finnhub `quote` — one row per symbol via urlWithSymbol polling. */
const FINNHUB_QUOTE_COLUMNS = { price: 'c', change: 'dp' };
/** Alpha Vantage `GLOBAL_QUOTE` wrapped object. */
const AV_QUOTE_COLUMNS = {
  price: 'Global Quote.05. price',
  change: 'Global Quote.10. change percent',
};
const AV_DAILY_OHLC = {
  open: '1. open',
  high: '2. high',
  low: '3. low',
  close: '4. close',
};

const avQuery = (fn: string, symbol: string, key = 'demo') =>
  `https://www.alphavantage.co/query?function=${fn}&symbol=${symbol}&apikey=${key}`;
const finnhub = (path: string) => `https://finnhub.io/api/v1/${path}`;
const coinbaseSpot = (pair: string) =>
  `https://api.coinbase.com/v2/prices/${pair}/spot`;

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const US_STOCKS: WidgetInstance[] = [
  w('tpl-us-quote', 'card', { x: 0, y: 0, w: 3, h: 4 }, {
    ...base(
      'finnhub',
      finnhub('quote?symbol=AAPL'),
      'AAPL',
      [
        F('c', 'Price', 'currency'),
        F('d', 'Change', 'currency'),
        F('dp', 'Change %', 'percent'),
      ],
    ),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-us-watch', 'card', { x: 3, y: 0, w: 4, h: 6 }, {
    ...base('finnhub', finnhub('quote?symbol=AAPL'), 'Watchlist'),
    card: {
      kind: 'watchlist',
      symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL'],
      columns: FINNHUB_QUOTE_COLUMNS,
    },
  }),
  w('tpl-us-chart', 'chart', { x: 7, y: 0, w: 5, h: 6 }, {
    ...base('alpha-vantage', avQuery('TIME_SERIES_DAILY', 'IBM'), 'IBM · Daily'),
    chart: {
      kind: 'candle',
      interval: 'daily',
      listPath: 'Time Series (Daily)',
      xField: 'date',
      ohlc: AV_DAILY_OHLC,
    },
  }),
  w('tpl-us-metrics', 'card', { x: 0, y: 6, w: 3, h: 4 }, {
    ...base(
      'finnhub',
      finnhub('stock/metric?symbol=AAPL&metric=all'),
      'AAPL metrics',
      [
        F('metric.marketCapitalization', 'Market cap', 'number'),
        F('metric.peNormalizedAnnual', 'P/E (norm)', 'number'),
        F('metric.52WeekHigh', '52w high', 'currency'),
        F('metric.52WeekLow', '52w low', 'currency'),
        F('metric.beta', 'Beta', 'number'),
      ],
      300,
    ),
    card: { kind: 'financials', symbols: [] },
  }),
  w('tpl-us-gainers', 'card', { x: 3, y: 6, w: 4, h: 6 }, {
    ...base(
      'alpha-vantage',
      'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo',
      'Top gainers',
      [],
      300,
    ),
    card: {
      kind: 'gainers',
      symbols: [],
      listPath: 'top_gainers',
      columns: {
        name: 'ticker',
        price: 'price',
        change: 'change_percentage',
      },
    },
  }),
];

const INDIAN_MARKETS: WidgetInstance[] = [
  w('tpl-in-watch', 'card', { x: 0, y: 0, w: 4, h: 6 }, {
    ...base(
      'alpha-vantage',
      avQuery('GLOBAL_QUOTE', 'RELIANCE.BSE'),
      'BSE watchlist',
    ),
    card: {
      kind: 'watchlist',
      symbols: ['RELIANCE.BSE', 'TCS.BSE', 'INFY.BSE', 'HDFCBANK.BSE'],
      columns: AV_QUOTE_COLUMNS,
    },
  }),
  w('tpl-in-quote', 'card', { x: 4, y: 0, w: 3, h: 4 }, {
    ...base('alpha-vantage', avQuery('GLOBAL_QUOTE', 'RELIANCE.BSE'), 'RELIANCE', [
      F('Global Quote.05. price', 'Price', 'currency'),
      F('Global Quote.10. change percent', 'Change %', 'percent'),
    ]),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-in-chart', 'chart', { x: 7, y: 0, w: 5, h: 6 }, {
    ...base(
      'alpha-vantage',
      avQuery('TIME_SERIES_DAILY', 'RELIANCE.BSE'),
      'RELIANCE · Daily',
      [],
      300,
    ),
    chart: {
      kind: 'candle',
      interval: 'daily',
      listPath: 'Time Series (Daily)',
      xField: 'date',
      ohlc: AV_DAILY_OHLC,
    },
  }),
  w('tpl-in-quote2', 'card', { x: 4, y: 4, w: 3, h: 4 }, {
    ...base('alpha-vantage', avQuery('GLOBAL_QUOTE', 'TCS.BSE'), 'TCS', [
      F('Global Quote.05. price', 'Price', 'currency'),
      F('Global Quote.10. change percent', 'Change %', 'percent'),
    ]),
    card: { kind: 'quote', symbols: [] },
  }),
];

const CRYPTO: WidgetInstance[] = [
  w('tpl-crypto-btc', 'card', { x: 0, y: 0, w: 3, h: 4 }, {
    ...base('custom', coinbaseSpot('BTC-USD'), 'BTC / USD', [
      F('data.amount', 'Price', 'currency'),
    ]),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-crypto-eth', 'card', { x: 3, y: 0, w: 3, h: 4 }, {
    ...base('custom', coinbaseSpot('ETH-USD'), 'ETH / USD', [
      F('data.amount', 'Price', 'currency'),
    ]),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-crypto-chart', 'chart', { x: 6, y: 0, w: 6, h: 6 }, {
    ...base(
      'custom',
      'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=90',
      'BTC · Daily candles',
      [],
      300,
    ),
    chart: {
      kind: 'candle',
      interval: 'daily',
      listPath: 'Data.Data',
      xField: 'time',
      ohlc: { open: 'open', high: 'high', low: 'low', close: 'close' },
    },
  }),
  w('tpl-crypto-table', 'table', { x: 0, y: 4, w: 8, h: 7 }, {
    ...base(
      'custom',
      'https://min-api.cryptocompare.com/data/top/mktcapfull?limit=25&tsym=USD',
      'Top crypto by market cap',
      [
        F('CoinInfo.FullName', 'Name', 'text'),
        F('CoinInfo.Name', 'Symbol', 'text'),
        F('RAW.USD.PRICE', 'Price', 'currency'),
        F('RAW.USD.CHANGEPCT24HOUR', 'Change %', 'percent'),
        F('RAW.USD.MKTCAP', 'Market cap', 'number'),
      ],
      300,
    ),
    table: { pageSize: 10, sortDir: 'desc', sortField: 'RAW.USD.MKTCAP', listPath: 'Data' },
  }),
];

export const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'us-stocks',
    name: 'US stocks',
    description: 'Quote, watchlist, metrics, gainers and a daily candle chart.',
    payload: exportOf(US_STOCKS),
  },
  {
    id: 'indian-markets',
    name: 'Indian markets',
    description: 'BSE quotes, a watchlist and a Reliance candle chart.',
    payload: exportOf(INDIAN_MARKETS),
  },
  {
    id: 'crypto',
    name: 'Crypto',
    description: 'Spot prices, market-cap table and BTC daily candles.',
    payload: exportOf(CRYPTO),
  },
];

export function templateById(id: string): DashboardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
