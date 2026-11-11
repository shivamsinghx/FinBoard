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
 * Endpoints are limited to what the proxy can serve: Coinbase and
 * Binance (keyless), Finnhub + Alpha Vantage (key injected
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
/** AV endpoint without apikey — the proxy injects the configured key. */
const avKeyed = (params: string) =>
  `https://www.alphavantage.co/query?${params}`;
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
  w('tpl-crypto-watch', 'card', { x: 6, y: 0, w: 6, h: 5 }, {
    ...base(
      'custom',
      'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
      'USDT watchlist',
      [],
      60,
    ),
    card: {
      kind: 'watchlist',
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
      columns: { price: 'lastPrice', change: 'priceChangePercent' },
    },
  }),
  w('tpl-crypto-table', 'table', { x: 0, y: 4, w: 8, h: 7 }, {
    ...base(
      'custom',
      'https://api.binance.com/api/v3/ticker/24hr',
      'All Binance tickers',
      [
        F('symbol', 'Symbol', 'text'),
        F('lastPrice', 'Price', 'number'),
        F('priceChangePercent', 'Change %', 'percent'),
        F('highPrice', '24h high', 'number'),
        F('lowPrice', '24h low', 'number'),
        F('quoteVolume', 'Quote vol', 'number'),
      ],
      120,
    ),
    table: { pageSize: 10, sortDir: 'desc', sortField: 'quoteVolume', listPath: '' },
  }),
];

/** Finnhub quote fields — shared by every quote/watchlist card. */
const FH_QUOTE_FIELDS = [
  F('c', 'Price', 'currency'),
  F('d', 'Change', 'currency'),
  F('dp', 'Change %', 'percent'),
];

const MAG_7: WidgetInstance[] = [
  w('tpl-m7-watch', 'card', { x: 0, y: 0, w: 4, h: 7 }, {
    ...base('finnhub', finnhub('quote?symbol=AAPL'), 'Magnificent 7'),
    card: {
      kind: 'watchlist',
      symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'],
      columns: FINNHUB_QUOTE_COLUMNS,
    },
  }),
  w('tpl-m7-nvda', 'card', { x: 4, y: 0, w: 3, h: 4 }, {
    ...base('finnhub', finnhub('quote?symbol=NVDA'), 'NVDA', FH_QUOTE_FIELDS),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-m7-meta', 'card', { x: 7, y: 0, w: 3, h: 4 }, {
    ...base('finnhub', finnhub('quote?symbol=META'), 'META', FH_QUOTE_FIELDS),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-m7-metrics', 'card', { x: 10, y: 0, w: 3, h: 5 }, {
    ...base(
      'finnhub',
      finnhub('stock/metric?symbol=NVDA&metric=all'),
      'NVDA metrics',
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
  w('tpl-m7-gainers', 'card', { x: 4, y: 5, w: 5, h: 6 }, {
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

const SECTOR_PULSE: WidgetInstance[] = [
  w('tpl-sp-spy', 'card', { x: 0, y: 0, w: 3, h: 4 }, {
    ...base('finnhub', finnhub('quote?symbol=SPY'), 'SPY', FH_QUOTE_FIELDS),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-sp-index', 'card', { x: 3, y: 0, w: 4, h: 5 }, {
    ...base('finnhub', finnhub('quote?symbol=SPY'), 'Index ETFs'),
    card: {
      kind: 'watchlist',
      symbols: ['SPY', 'QQQ', 'DIA', 'IWM'],
      columns: FINNHUB_QUOTE_COLUMNS,
    },
  }),
  w('tpl-sp-sectors', 'card', { x: 7, y: 0, w: 5, h: 7 }, {
    ...base('finnhub', finnhub('quote?symbol=XLK'), 'Sector ETFs'),
    card: {
      kind: 'watchlist',
      symbols: ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP'],
      columns: FINNHUB_QUOTE_COLUMNS,
    },
  }),
  w('tpl-sp-gainers', 'card', { x: 0, y: 5, w: 4, h: 6 }, {
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

/**
 * Coinbase exchange-rates — rates for 1 unit of the base across fiat +
 * crypto, keyless. A "USD rates" card reads data.rates.EUR etc.
 */
const cbRates = (base: string) =>
  `https://api.coinbase.com/v2/exchange-rates?currency=${base}`;
const rateFields = (...codes: string[]) =>
  codes.map((c) => F(`data.rates.${c}`, c, 'number'));

const FX_MAJORS: WidgetInstance[] = [
  w('tpl-fx-usd', 'card', { x: 0, y: 0, w: 3, h: 4 }, {
    ...base('custom', cbRates('USD'), 'USD rates', rateFields('EUR', 'GBP', 'JPY', 'INR'), 120),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-fx-eur', 'card', { x: 3, y: 0, w: 3, h: 4 }, {
    ...base('custom', cbRates('EUR'), 'EUR rates', rateFields('USD', 'GBP', 'JPY', 'INR'), 120),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-fx-inr', 'card', { x: 6, y: 0, w: 3, h: 4 }, {
    ...base('custom', cbRates('INR'), 'INR rates', rateFields('USD', 'EUR', 'GBP', 'JPY'), 120),
    card: { kind: 'quote', symbols: [] },
  }),
  w('tpl-fx-btc', 'card', { x: 9, y: 0, w: 3, h: 4 }, {
    ...base('custom', cbRates('BTC'), 'BTC rates', rateFields('USD', 'EUR', 'INR', 'GBP'), 120),
    card: { kind: 'quote', symbols: [] },
  }),
];

/** AV commodity series — `data` rows of {date, value}; weekly keeps the response small. */
const avCommodity = (fn: string) =>
  avKeyed(`function=${fn}&interval=weekly`);
const COMMODITY_LINE = (label: string) => [
  F('value', label, 'number'),
];

const COMMODITIES: WidgetInstance[] = [
  w('tpl-co-wti', 'chart', { x: 0, y: 0, w: 4, h: 5 }, {
    ...base('alpha-vantage', avCommodity('WTI'), 'WTI crude · weekly', COMMODITY_LINE('WTI'), 900),
    chart: { kind: 'line', interval: 'weekly', listPath: 'data', xField: 'date' },
  }),
  w('tpl-co-gas', 'chart', { x: 4, y: 0, w: 4, h: 5 }, {
    ...base('alpha-vantage', avCommodity('NATURAL_GAS'), 'Natural gas · weekly', COMMODITY_LINE('Nat. gas'), 900),
    chart: { kind: 'line', interval: 'weekly', listPath: 'data', xField: 'date' },
  }),
  w('tpl-co-copper', 'chart', { x: 8, y: 0, w: 4, h: 5 }, {
    ...base('alpha-vantage', avCommodity('COPPER'), 'Copper · weekly', COMMODITY_LINE('Copper'), 900),
    chart: { kind: 'line', interval: 'weekly', listPath: 'data', xField: 'date' },
  }),
  w('tpl-co-table', 'table', { x: 0, y: 5, w: 6, h: 6 }, {
    ...base(
      'alpha-vantage',
      avCommodity('WTI'),
      'WTI crude · recent',
      [F('date', 'Date', 'date'), F('value', 'USD / barrel', 'number')],
      900,
    ),
    table: { pageSize: 10, sortDir: 'desc', sortField: 'date', listPath: 'data' },
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
    description:
      'BSE quotes, a watchlist and a Reliance candle chart. Needs an Alpha Vantage key.',
    payload: exportOf(INDIAN_MARKETS),
  },
  {
    id: 'crypto',
    name: 'Crypto',
    description:
      'Coinbase spot prices, a Binance USDT watchlist and every Binance ticker in a sortable table.',
    payload: exportOf(CRYPTO),
  },
  {
    id: 'mag-7',
    name: 'Magnificent 7',
    description:
      'Mega-cap watchlist, NVDA and META quotes, metrics and top gainers.',
    payload: exportOf(MAG_7),
  },
  {
    id: 'sector-pulse',
    name: 'Sector pulse',
    description:
      'Index and sector ETF watchlists, an SPY quote and top gainers.',
    payload: exportOf(SECTOR_PULSE),
  },
  {
    id: 'fx-majors',
    name: 'FX majors',
    description:
      'USD, EUR, INR and BTC exchange-rate cards via Coinbase — no key needed.',
    payload: exportOf(FX_MAJORS),
  },
  {
    id: 'commodities',
    name: 'Commodities',
    description:
      'Weekly WTI, natural gas and copper charts with a recent-price table. Needs an Alpha Vantage key.',
    payload: exportOf(COMMODITIES),
  },
];

export function templateById(id: string): DashboardTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
