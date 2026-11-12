import { describe, expect, it } from 'vitest';
import type { WidgetInstance } from '@/types/widget';
import { countKeyedWidgets, stripKeysFromExport } from './exportKeys';

const widget = (endpoint: string): WidgetInstance =>
  ({
    id: 'w1',
    type: 'card',
    layout: { x: 0, y: 0, w: 3, h: 4 },
    createdAt: '2025-01-01T00:00:00.000Z',
    config: {
      provider: 'custom',
      title: 't',
      endpoint,
      refreshIntervalSec: 30,
      params: {},
      fields: [],
    },
  }) as WidgetInstance;

const exportJson = (endpoints: string[]) =>
  JSON.stringify({
    version: 1,
    exportedAt: '2025-01-01T00:00:00.000Z',
    widgets: endpoints.map(widget),
  });

describe('countKeyedWidgets', () => {
  it('counts non-demo token/apikey params', () => {
    const widgets = [
      widget('https://finnhub.io/api/v1/quote?symbol=AAPL&token=abc123'),
      widget('https://www.alphavantage.co/query?function=X&apikey=real'),
      widget('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
    ];
    expect(countKeyedWidgets(widgets)).toBe(2);
  });

  it('ignores apikey=demo and param-less URLs', () => {
    const widgets = [
      widget('https://www.alphavantage.co/query?function=X&symbol=IBM&apikey=demo'),
      widget('https://api.coinbase.com/v2/exchange-rates?currency=USD'),
    ];
    expect(countKeyedWidgets(widgets)).toBe(0);
  });
});

describe('stripKeysFromExport', () => {
  it('removes key params but keeps everything else', () => {
    const out = JSON.parse(
      stripKeysFromExport(
        exportJson([
          'https://finnhub.io/api/v1/quote?symbol=AAPL&token=abc123',
          'https://www.alphavantage.co/query?function=X&symbol=IBM&apikey=real&outputsize=compact',
        ]),
      ),
    ) as { widgets: WidgetInstance[] };
    expect(out.widgets[0].config.endpoint).toBe(
      'https://finnhub.io/api/v1/quote?symbol=AAPL',
    );
    expect(out.widgets[1].config.endpoint).toBe(
      'https://www.alphavantage.co/query?function=X&symbol=IBM&outputsize=compact',
    );
  });

  it('leaves apikey=demo untouched', () => {
    const url =
      'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo';
    const out = JSON.parse(stripKeysFromExport(exportJson([url]))) as {
      widgets: WidgetInstance[];
    };
    expect(out.widgets[0].config.endpoint).toBe(url);
  });
});
