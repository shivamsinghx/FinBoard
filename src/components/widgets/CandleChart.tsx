'use client';

import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/chartSeries';

/**
 * Candlestick chart on lightweight-charts — loaded via next/dynamic
 * (ssr: false) from ChartWidget so its bundle stays out of the page.
 * `autoSize` tracks the container, so it reflows with the widget grid.
 */
export default function CandleChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const json = JSON.stringify(candles);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#8a857c',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#f0ece2' },
        horzLines: { color: '#f0ece2' },
      },
      rightPriceScale: { borderColor: '#e8e3d8' },
      timeScale: { borderColor: '#e8e3d8', timeVisible: true },
      crosshair: {
        vertLine: { color: '#d3ccbd', labelBackgroundColor: '#57534e' },
        horzLine: { color: '#d3ccbd', labelBackgroundColor: '#57534e' },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#059669',
      downColor: '#e11d48',
      wickUpColor: '#059669',
      wickDownColor: '#e11d48',
      borderVisible: false,
    });

    // LWC requires strictly ascending, unique times — dedupe, last wins.
    const seen = new Map<number, CandlestickData<UTCTimestamp>>();
    for (const c of JSON.parse(json) as Candle[]) {
      if (c.t === null) continue;
      const time = Math.floor(c.t / 1000) as UTCTimestamp;
      seen.set(time, {
        time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
    }
    const data = [...seen.values()].sort((a, b) => a.time - b.time);
    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [json]);

  return <div ref={ref} className="h-full w-full min-h-40" />;
}
