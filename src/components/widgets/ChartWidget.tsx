'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import { useWidgetData } from '@/hooks/useWidgetData';
import {
  buildCandles,
  buildSeries,
  resampleCandles,
  resamplePoints,
  sortByTime,
  type ChartPeriod,
} from '@/lib/chartSeries';
import { formatValue } from '@/lib/formatters';
import { rowsAtPath } from '@/lib/widgetFields';
import type { ChartKind, WidgetInstance } from '@/types/widget';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { WidgetShell } from './WidgetShell';

const CandleChart = dynamic(() => import('./CandleChart'), { ssr: false });

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const KINDS: { value: ChartKind; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'candle', label: 'Candle' },
];

const SEG_ITEM =
  'px-2 py-0.5 text-[11px] data-[pressed]:bg-surface data-[pressed]:text-ink data-[pressed]:shadow-xs aria-[pressed]:bg-surface aria-[pressed]:text-ink aria-[pressed]:shadow-xs data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-xs';

export function ChartWidget({ widget }: { widget: WidgetInstance }) {
  const cfg = widget.config;
  const chart = cfg.chart;
  const query = useWidgetData(cfg.endpoint || null, cfg.refreshIntervalSec);
  const listPath = chart?.listPath;
  const xField = chart?.xField;
  const ohlc = chart?.ohlc;

  const hasOhlc = !!(ohlc?.open && ohlc.high && ohlc.low && ohlc.close);

  const [period, setPeriod] = useState<ChartPeriod>(() =>
    chart?.interval === 'weekly' || chart?.interval === 'monthly'
      ? chart.interval
      : 'daily',
  );
  const [kind, setKind] = useState<ChartKind>(chart?.kind ?? 'line');
  const effectiveKind = kind === 'candle' && !hasOhlc ? 'line' : kind;
  /** Line/area draw the configured value fields; candle needs its map. */
  const valueFields = useMemo(
    () => (effectiveKind === 'candle' ? [] : cfg.fields),
    [effectiveKind, cfg.fields],
  );

  const rows = useMemo(
    () => (listPath ? rowsAtPath(query.data, listPath) : []),
    [query.data, listPath],
  );

  const seriesData = useMemo(
    () =>
      xField
        ? resamplePoints(
            sortByTime(
              buildSeries(
                rows,
                xField,
                valueFields.map((f) => f.path),
              ),
            ),
            period,
          )
        : [],
    [rows, xField, valueFields, period],
  );

  const candleData = useMemo(
    () =>
      xField
        ? resampleCandles(
            sortByTime(buildCandles(rows, xField, ohlc ?? {})),
            period,
          )
        : [],
    [rows, xField, ohlc, period],
  );

  /** LWC needs real timestamps; undated candles can't be placed. */
  const timedCandles = useMemo(
    () => candleData.filter((c) => c.t !== null),
    [candleData],
  );

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        valueFields.map((f, i) => [
          f.path,
          { label: f.label, color: `var(--chart-${(i % 5) + 1})` },
        ]),
      ),
    [valueFields],
  );

  const yFormat = valueFields[0]?.format ?? 'auto';
  const headerExtra = (
    <div className="flex shrink-0 items-center gap-1.5">
      <ToggleGroup
        value={[period]}
        onValueChange={(v) => v[0] && setPeriod(v[0] as ChartPeriod)}
        spacing={0.5}
        className="rounded-md bg-raised p-0.5"
        aria-label="Chart period"
      >
        {PERIODS.map((p) => (
          <ToggleGroupItem key={p.value} value={p.value} className={SEG_ITEM}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        value={[effectiveKind]}
        onValueChange={(v) => v[0] && setKind(v[0] as ChartKind)}
        spacing={0.5}
        className="rounded-md bg-raised p-0.5"
        aria-label="Chart type"
      >
        {KINDS.map((k) => (
          <ToggleGroupItem
            key={k.value}
            value={k.value}
            disabled={k.value === 'candle' && !hasOhlc}
            className={SEG_ITEM}
          >
            {k.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  const empty =
    !xField ||
    rows.length === 0 ||
    (effectiveKind === 'candle'
      ? timedCandles.length === 0
      : valueFields.length === 0 || seriesData.length === 0);

  return (
    <WidgetShell
      widget={widget}
      query={query}
      empty={empty}
      headerExtra={headerExtra}
    >
      <div className="flex h-full min-h-[180px] w-full flex-col">
        {effectiveKind === 'candle' ? (
          <CandleChart candles={timedCandles} />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-full w-full flex-1"
          >
            {effectiveKind === 'area' ? (
              <AreaChart data={seriesData} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--subtle)" />
                <XAxis
                  dataKey="x"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(v) => formatValue(v, 'date')}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatValue(v, yFormat)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => formatValue(v, 'date')}
                    />
                  }
                />
                {valueFields.length > 1 && (
                  <ChartLegend content={<ChartLegendContent />} />
                )}
                {valueFields.map((f) => (
                  <Area
                    key={f.path}
                    dataKey={(d: { values: Record<string, number | null> }) =>
                      d.values[f.path]
                    }
                    name={f.path}
                    stroke={`var(--color-${f.path})`}
                    fill={`var(--color-${f.path})`}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={seriesData} margin={{ left: 4, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--subtle)" />
                <XAxis
                  dataKey="x"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(v) => formatValue(v, 'date')}
                />
                <YAxis
                  width={48}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatValue(v, yFormat)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => formatValue(v, 'date')}
                    />
                  }
                />
                {valueFields.length > 1 && (
                  <ChartLegend content={<ChartLegendContent />} />
                )}
                {valueFields.map((f) => (
                  <Line
                    key={f.path}
                    dataKey={(d: { values: Record<string, number | null> }) =>
                      d.values[f.path]
                    }
                    name={f.path}
                    stroke={`var(--color-${f.path})`}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ChartContainer>
        )}
      </div>
    </WidgetShell>
  );
}
