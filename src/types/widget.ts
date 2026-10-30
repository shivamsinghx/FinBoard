/**
 * Domain types for the FinBoard customizable finance dashboard.
 *
 * These types describe persisted widget state. They intentionally do not
 * depend on react-grid-layout — conversion between `WidgetLayout` and RGL's
 * `LayoutItem` happens at the grid boundary.
 */

export type WidgetType = 'card' | 'table' | 'chart';

export type ThemeMode = 'light' | 'dark';

/** Financial data providers a widget can connect to. */
export type ApiProvider = 'alpha-vantage' | 'finnhub' | 'indian-api' | 'custom';

/** Formatting applied to a mapped field at render time. */
export type DataFormat =
  | 'auto'
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date';

/**
 * A single field the user picked out of an API response via the
 * JSON explorer / field selection interface.
 */
export interface FieldMapping {
  /** Dot/bracket path into the JSON response, e.g. `"Global Quote.05. price"` or `"data[0].c"`. */
  path: string;
  /** Human-readable label displayed in the widget. */
  label: string;
  format: DataFormat;
}

/* ------------------------------------------------------------------ */
/* Per-widget-type display settings                                    */
/* ------------------------------------------------------------------ */

export type CardKind =
  | 'watchlist'
  | 'gainers'
  | 'losers'
  | 'performance'
  | 'financials'
  | 'quote';

export interface CardSettings {
  kind: CardKind;
  /** Symbols this card tracks (watchlist/quote cards). */
  symbols: string[];
}

export interface TableSettings {
  pageSize: number;
  /** Path of the FieldMapping used for sorting, if any. */
  sortField?: string;
  sortDir: 'asc' | 'desc';
}

export type ChartKind = 'line' | 'area' | 'candle';

export type ChartInterval =
  | '1min'
  | '5min'
  | '15min'
  | '30min'
  | '60min'
  | 'daily'
  | 'weekly'
  | 'monthly';

export interface ChartSettings {
  kind: ChartKind;
  interval: ChartInterval;
}

/* ------------------------------------------------------------------ */
/* Widget config / instance                                            */
/* ------------------------------------------------------------------ */

/** Everything the user can change in a widget's configuration panel. */
export interface WidgetConfig {
  title: string;
  description?: string;

  provider: ApiProvider;
  /**
   * Endpoint identifier. For known providers this is a function/path key
   * (e.g. Alpha Vantage `GLOBAL_QUOTE`); for `custom` it is a full URL.
   */
  endpoint: string;
  /** Extra query parameters merged into the request (e.g. `symbol`, `function`). */
  params: Record<string, string>;
  /** Primary symbol shortcut — kept for convenience, also usable in params. */
  symbol?: string;

  /** User-selected fields to display (dynamic data mapping). */
  fields: FieldMapping[];

  /** Auto-refresh cadence in seconds; `0` disables auto-refresh. */
  refreshIntervalSec: number;

  card?: CardSettings;
  table?: TableSettings;
  chart?: ChartSettings;
}

/** Grid position in grid units — mirrors RGL `LayoutItem` minus the `i` key. */
export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  layout: WidgetLayout;
  config: WidgetConfig;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Export / import payload                                             */
/* ------------------------------------------------------------------ */

export interface DashboardExport {
  version: number;
  exportedAt: string;
  theme: ThemeMode;
  widgets: WidgetInstance[];
}

/* ------------------------------------------------------------------ */
/* Grid defaults                                                       */
/* ------------------------------------------------------------------ */

export const GRID_COLS = 12;

export const WIDGET_GRID_DEFAULTS: Record<
  WidgetType,
  Pick<WidgetLayout, 'w' | 'h' | 'minW' | 'minH'>
> = {
  card: { w: 4, h: 4, minW: 2, minH: 3 },
  table: { w: 8, h: 6, minW: 4, minH: 4 },
  chart: { w: 6, h: 5, minW: 3, minH: 3 },
};

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  card: 'Finance Card',
  table: 'Stock Table',
  chart: 'Price Chart',
};
