import {
  ArrowRight,
  Braces,
  ChartCandlestick,
  Coins,
  Globe,
  KeyRound,
  Landmark,
  LineChart as LineChartIcon,
  Link2,
  RefreshCw,
  ShieldCheck,
  Table2,
  Timer,
  Wallet,
} from 'lucide-react';
import {
  OpenInBuilderButton,
  StartFromTemplateButton,
  WatchHowButton,
} from '@/components/docs/DocActions';
import { DocCode } from '@/components/docs/DocCode';
import { FormatPlayground } from '@/components/docs/FormatPlayground';
import { docErrorSlug } from '@/lib/docsSections';
import { TEMPLATES } from '@/lib/templates';
import type { ProxyErrorCode } from '@/types/api';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Inline code chip — paths, keys and values. */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-subtle bg-raised px-1 py-px font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

/** Numbered section wrapper — anchor id + hover share link. */
function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="group flex items-baseline gap-2 font-display text-[22px] tracking-tight">
        <span className="text-sm text-faint">{index}.</span>
        {title}
        <a
          href={`#${id}`}
          aria-label={`Link to ${title}`}
          className="self-center text-faint opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Link2 className="size-3.5" aria-hidden />
        </a>
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 1 — Getting started                                                 */
/* ------------------------------------------------------------------ */

const START_STEPS: [string, string][] = [
  [
    'Paste a URL & test',
    'Add widget → drop in any finance endpoint → Test (or hit Enter). You get the raw JSON back in seconds.',
  ],
  [
    'Pick fields or a list',
    'Search the response, click + on the fields you want. Pick a list when you’re building a table or chart.',
  ],
  [
    'Choose a display & arrange',
    'Card, table or chart — the widget lands on the grid sized for its type. Drag it where you want; the layout saves itself.',
  ],
];

function GettingStarted() {
  return (
    <>
      <ol className="space-y-4">
        {START_STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink">{t}</p>
              <p className="mt-0.5 text-[13px]">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        <WatchHowButton />
        <StartFromTemplateButton />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2 — Supported APIs                                                  */
/* ------------------------------------------------------------------ */

interface ApiCard {
  icon: React.ElementType;
  name: string;
  goodFor: string;
  keyLabel: string;
  keyTone?: 'ok' | 'warn';
  limits: string;
  examples: { label: string; url: string; builder?: boolean }[];
  note?: string;
}

const APIS: ApiCard[] = [
  {
    icon: LineChartIcon,
    name: 'Finnhub',
    goodFor: 'US & global stock quotes, company metrics, OHLC candles — the backbone of the US-stocks template.',
    keyLabel: 'Free key — injected by the proxy',
    limits: 'Free tier ~30 calls/min. Set FINNHUB_API_KEY in .env.local and the proxy appends token= automatically.',
    examples: [
      { label: 'Quote', url: 'https://finnhub.io/api/v1/quote?symbol=AAPL', builder: true },
      { label: 'Daily candles', url: 'https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=1704067200&to=1735689600', builder: true },
    ],
  },
  {
    icon: Landmark,
    name: 'Alpha Vantage',
    goodFor: 'Global quotes, daily series, top gainers/losers, and BSE symbols for Indian markets.',
    keyLabel: 'Free key — injected · demo works for IBM',
    limits: 'Free tier 25 req/day. ALPHA_VANTAGE_API_KEY in .env.local; apikey=demo returns real data for a handful of endpoints.',
    examples: [
      { label: 'Daily series (demo)', url: 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=demo', builder: true },
      { label: 'Top gainers (demo)', url: 'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo', builder: true },
    ],
  },
  {
    icon: Coins,
    name: 'Coinbase & CryptoCompare',
    goodFor: 'Keyless crypto prices and history — Coinbase for spot/exchange rates, CryptoCompare for OHLC and market-cap lists.',
    keyLabel: 'No key needed',
    limits: 'Public endpoints with their own rate limits — keep refresh at 30s+.',
    examples: [
      { label: 'Exchange rates', url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC', builder: true },
      { label: 'Daily candles', url: 'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=30', builder: true },
    ],
  },
  {
    icon: Globe,
    name: 'IndianAPI',
    goodFor: 'NSE/BSE stock details, trending lists, IPO and market news from indianapi.in.',
    keyLabel: 'Free key — but header-auth',
    keyTone: 'warn',
    limits: 'Authenticates via an X-Api-Key request header. Our proxy sends plain GETs and can’t attach headers, so these endpoints can’t be used yet — query-param APIs only.',
    examples: [
      { label: 'Trending (needs header key)', url: 'https://stock.indianapi.in/trending' },
    ],
    note: 'For Indian markets today, use Alpha Vantage BSE symbols — that’s what the Indian markets template does.',
  },
  {
    icon: Braces,
    name: 'Any public JSON API',
    goodFor: 'If a GET request returns JSON over public HTTPS, FinBoard can chart, tabulate or card it.',
    keyLabel: 'Depends on the API',
    limits: 'Keys must live in the URL query string. Localhost and private-network hosts are blocked by the proxy.',
    examples: [
      { label: 'Shape', url: 'https://api.example.com/v1/quotes?symbol=AAPL&apikey=YOUR_KEY' },
    ],
  },
];

function SupportedApis() {
  return (
    <div className="space-y-3">
      {APIS.map((a) => (
        <div
          key={a.name}
          className="rounded-xl border border-subtle bg-surface p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <a.icon className="size-4 text-accent" aria-hidden />
            <p className="font-medium text-ink">{a.name}</p>
            <Badge
              variant={a.keyTone === 'warn' ? 'outline' : 'secondary'}
              className={
                a.keyTone === 'warn'
                  ? 'border-amber-500/40 text-amber-700'
                  : 'text-faint'
              }
            >
              {a.keyLabel}
            </Badge>
          </div>
          <p className="mt-2 text-[13px]">{a.goodFor}</p>
          <p className="mt-1 text-[12px] text-faint">{a.limits}</p>
          {a.note && (
            <p className="mt-1.5 rounded-md bg-raised/70 px-2.5 py-1.5 text-[12px]">
              {a.note}
            </p>
          )}
          <div className="mt-3 space-y-2">
            {a.examples.map((ex) => (
              <div key={ex.label} className="flex items-center gap-2">
                <DocCode
                  code={ex.url}
                  title={ex.label}
                  lang="text"
                  className="min-w-0 flex-1 bg-raised [&_pre]:truncate"
                />
                {ex.builder && <OpenInBuilderButton url={ex.url} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 — API keys & security                                             */
/* ------------------------------------------------------------------ */

function ApiKeys() {
  return (
    <>
      <p>
        Get free keys at the providers:{' '}
        <Code>finnhub.io</Code> (dashboard → API key) and{' '}
        <Code>alphavantage.co</Code> (claim free API key). Drop them in{' '}
        <Code>.env.local</Code> at the repo root:
      </p>
      <DocCode
        title=".env.local"
        lang="bash"
        code={'FINNHUB_API_KEY=your_finnhub_key\nALPHA_VANTAGE_API_KEY=your_av_key'}
      />
      <p className="flex gap-2.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <span>
          Widgets never hold your keys. Every request goes through{' '}
          <Code>/api/proxy</Code>, which checks the host is public, injects the
          matching env key into the upstream URL server-side, and returns only
          the JSON body. Keys never reach the browser — widget headers show
          endpoints with the query string stripped.
        </span>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 4 — Widget types                                                    */
/* ------------------------------------------------------------------ */

/** Static mini quote card in real widget styling. */
function CardPreview() {
  return (
    <div className="rounded-xl border border-subtle bg-surface p-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted">AAPL</span>
        <span className="size-1.5 rounded-full bg-up" aria-hidden />
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">$214.32</p>
      <p className="text-[11px] font-medium text-up tabular-nums">+1.24%</p>
    </div>
  );
}

function TablePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-subtle bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-raised/60">
            <TableHead className="h-7 text-[11px]">Name</TableHead>
            <TableHead className="h-7 text-right text-[11px]">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ['Reliance', '2,841.20'],
            ['TCS', '4,102.55'],
          ].map(([n, p]) => (
            <TableRow key={n} className="hover:bg-raised/50">
              <TableCell className="py-1.5 text-[11px]">{n}</TableCell>
              <TableCell className="py-1.5 text-right font-mono text-[11px] tabular-nums">
                {p}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ChartPreview() {
  return (
    <div className="rounded-xl border border-subtle bg-surface p-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <svg viewBox="0 0 160 56" className="h-14 w-full" aria-hidden>
        <path
          d="M0 44 L18 38 L36 41 L54 30 L72 33 L90 22 L108 26 L126 14 L144 18 L160 8 L160 56 L0 56 Z"
          fill="var(--accent-soft)"
        />
        <path
          d="M0 44 L18 38 L36 41 L54 30 L72 33 L90 22 L108 26 L126 14 L144 18 L160 8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

const WIDGET_CARDS: {
  icon: React.ElementType;
  name: string;
  needs: string;
  body: string;
  preview: React.ReactNode;
}[] = [
  {
    icon: Wallet,
    name: 'Card',
    needs: 'Individual fields — or a list / symbol set for watchlists, gainers, financials.',
    body: 'Quote, watchlist, top gainers/losers, performance and financial-data cards. Symbol watchlists poll one quote per symbol; list cards map name / price / change columns.',
    preview: <CardPreview />,
  },
  {
    icon: Table2,
    name: 'Table',
    needs: 'A list — a JSON array, or a date-keyed object like Alpha Vantage series.',
    body: 'Your chosen fields become the columns. Global search, numeric-aware sorting, min/max filters, column visibility, sticky header, 10/25/50-row pages.',
    preview: <TablePreview />,
  },
  {
    icon: ChartCandlestick,
    name: 'Chart',
    needs: 'A list with a time field — plus OHLC mapping for candlesticks.',
    body: 'Line and area charts over any value fields; candles when open/high/low/close are mapped. Resamples daily → weekly → monthly client-side.',
    preview: <ChartPreview />,
  },
];

function WidgetTypes() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {WIDGET_CARDS.map((w) => (
        <div key={w.name} className="flex flex-col gap-3">
          {w.preview}
          <div className="rounded-xl border border-subtle bg-raised/40 p-3.5">
            <div className="flex items-center gap-1.5">
              <w.icon className="size-4 text-accent" aria-hidden />
              <p className="font-medium text-ink">{w.name}</p>
            </div>
            <p className="mt-1.5 text-[12px]">{w.body}</p>
            <p className="mt-2 border-t border-subtle/60 pt-2 text-[11px] text-faint">
              <span className="font-medium text-muted">Needs:</span> {w.needs}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5 — Formatting playground                                           */
/* ------------------------------------------------------------------ */

function Formatting() {
  return (
    <>
      <p>
        Every field gets a format — <Code>auto</Code> guesses, or pin it to{' '}
        <Code>text</Code>, <Code>number</Code>, <Code>currency</Code>,{' '}
        <Code>percent</Code> or <Code>date</Code>. Change-like columns
        (price_change, percent_change…) color green/red automatically. This is
        the real formatter — type a value:
      </p>
      <FormatPlayground />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 6 — Refresh, caching & rate limits                                  */
/* ------------------------------------------------------------------ */

function PipeNode({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-center">
      <p className="font-mono text-[11px] font-medium text-ink">{title}</p>
      <p className="mt-0.5 text-[10px] leading-snug text-faint">{sub}</p>
    </div>
  );
}

function PipelineDiagram() {
  return (
    <div className="rounded-xl border border-subtle bg-raised/40 p-4">
      <div className="flex items-center gap-2">
        <PipeNode title="Widget" sub="own interval · ≥10s" />
        <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
        <PipeNode title="/api/proxy" sub="30s cache · dedupe · key injection" />
        <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
        <PipeNode title="Provider" sub="Finnhub · AV · Coinbase…" />
      </div>
      <p className="mt-3 text-center text-[11px] text-faint">
        Identical URLs collapse into one request — two widgets on the same
        endpoint cost a single upstream call.
      </p>
    </div>
  );
}

function RefreshSection() {
  const rows: [React.ReactNode, string][] = [
    [
      <Timer className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden key="i" />,
      'Each widget polls on its own interval — 10s minimum in the builder (0 disables auto-refresh). The footer shows the cadence and a Live dot pulses on each fetch.',
    ],
    [
      <RefreshCw className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden key="i" />,
      'The proxy caches each URL in memory for 30s (ttl param up to 1h), so rapid polls don’t reach the provider. Client-side, identical in-flight URLs merge into one fetch.',
    ],
    [
      <ChartCandlestick className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden key="i" />,
      'Symbol watchlists fire one quote request per symbol (20 max) on the widget’s interval — each is deduped and cached like any other URL.',
    ],
    [
      <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden key="i" />,
      'On RATE_LIMIT the widget keeps its last data behind an amber “Showing last data” bar and retries every 60s regardless of its interval. Polling also pauses while the tab is hidden.',
    ],
  ];
  return (
    <>
      <PipelineDiagram />
      <ul className="space-y-3">
        {rows.map(([icon, text], i) => (
          <li key={i} className="flex gap-2.5 text-[13px]">
            {icon}
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 7 — Export, import & templates                                      */
/* ------------------------------------------------------------------ */

const EXPORT_EXAMPLE = `{
  "version": 1,
  "exportedAt": "2025-05-01T12:00:00.000Z",
  "widgets": [
    {
      "id": "w_a91f",
      "type": "card",
      "layout": { "x": 0, "y": 0, "w": 3, "h": 4 },
      "config": {
        "title": "BTC / USD",
        "endpoint": "https://api.coinbase.com/v2/prices/BTC-USD/spot",
        "refreshIntervalSec": 30,
        "fields": [
          { "path": "data.amount", "label": "Spot", "format": "currency" }
        ]
      },
      "createdAt": "2025-04-20T09:41:00.000Z"
    }
  ]
}`;

function ExportTemplates() {
  return (
    <>
      <p>
        <span className="font-medium text-ink">Export</span> downloads{' '}
        <Code>finboard-dashboard.json</Code> — every widget with its type,
        grid layout and full config. It contains no keys and no cached data:
      </p>
      <DocCode title="finboard-dashboard.json" lang="json" code={EXPORT_EXAMPLE} />
      <p>
        <span className="font-medium text-ink">Import</span> reads the same
        file back — validation errors show a toast naming the problem (
        “Imported N widgets” on success).{' '}
        <span className="font-medium text-ink">Templates</span> (
        {TEMPLATES.map((t) => t.name).join(', ')}) are just prebuilt exports —
        loading one on an empty dashboard applies instantly; with widgets
        present it asks “Replace your current dashboard?” first.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 8 — Keyboard shortcuts                                              */
/* ------------------------------------------------------------------ */

const SHORTCUTS: { keys: string[]; what: string }[] = [
  { keys: ['Ctrl', 'K'], what: 'Command palette — add, refresh, export, import, templates, docs' },
  { keys: ['Enter'], what: 'In the URL field — test the endpoint' },
  { keys: ['↑', '↓'], what: 'Move through fields in the response explorer' },
  { keys: ['Enter'], what: 'Add the highlighted field' },
  { keys: ['Esc'], what: 'Close dialogs, the palette and menus' },
];

function Shortcuts() {
  return (
    <div className="overflow-hidden rounded-xl border border-subtle">
      <Table>
        <TableBody>
          {SHORTCUTS.map((s, i) => (
            <TableRow key={i} className="hover:bg-raised/40">
              <TableCell className="w-40 py-2.5">
                <span className="flex gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </TableCell>
              <TableCell className="py-2.5 text-[13px] text-muted">
                {s.what}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 9 — Troubleshooting                                                 */
/* ------------------------------------------------------------------ */

const ERROR_ITEMS: { code: ProxyErrorCode; meaning: string; fix: string }[] = [
  {
    code: 'INVALID_URL',
    meaning: 'The URL was rejected before any request — it isn’t public http(s).',
    fix: 'Use a full https:// URL. Embedded credentials (user:pass@) and localhost/private-network hosts are blocked by the proxy.',
  },
  {
    code: 'INVALID_KEY',
    meaning: 'The provider rejected authentication — bad, missing or plan-restricted key.',
    fix: 'If you put a key in the widget’s URL yourself, check it there. Otherwise the key is injected server-side from the deployment environment (FINNHUB_API_KEY / ALPHA_VANTAGE_API_KEY) — it’s a hosting-side setting, not fixable from the browser. Alpha Vantage’s demo key only works on a few endpoints (e.g. IBM).',
  },
  {
    code: 'RATE_LIMIT',
    meaning: 'The provider throttled the request (HTTP 429, or a rate-limit body — Alpha Vantage returns these as HTTP 200 Notes).',
    fix: 'Nothing to fix — the widget retries every 60s and keeps showing its last data. Raise the refresh interval or use your own key for headroom.',
  },
  {
    code: 'NOT_FOUND',
    meaning: 'The upstream API returned 404 — the path or parameters don’t exist.',
    fix: 'Check the endpoint path, symbol casing and required params (e.g. function=, symbol=).',
  },
  {
    code: 'TIMEOUT',
    meaning: 'The upstream API took longer than 10s to respond.',
    fix: 'Retry — and prefer narrower queries (smaller limit, tighter date range) on heavy endpoints.',
  },
  {
    code: 'NETWORK',
    meaning: 'The host couldn’t be reached — DNS failure or an unreachable server.',
    fix: 'Check the hostname spelling and that the API is actually up.',
  },
  {
    code: 'BAD_RESPONSE',
    meaning: 'The response wasn’t usable JSON — an HTML error page, a body over 5MB, or more than 3 redirects.',
    fix: 'Open the URL directly — it must return JSON. CSV/HTML endpoints aren’t supported.',
  },
];

function Troubleshooting() {
  return (
    <>
      <p>
        Widget error states link here. Find the code in the widget’s error
        message, then expand it:
      </p>
      <Accordion defaultValue={[docErrorSlug('RATE_LIMIT')]}>
        {ERROR_ITEMS.map((e) => (
          <div key={e.code} id={docErrorSlug(e.code)} className="scroll-mt-24">
            <AccordionItem value={docErrorSlug(e.code)}>
              <AccordionTrigger className="py-3">
                <span className="flex items-center gap-2">
                  <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-down">
                    {e.code}
                  </code>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-[13px]">
                <p>
                  <span className="font-medium text-ink">What it means — </span>
                  {e.meaning}
                </p>
                <p>
                  <span className="font-medium text-ink">How to fix — </span>
                  {e.fix}
                </p>
              </AccordionContent>
            </AccordionItem>
          </div>
        ))}
      </Accordion>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function DocsContent() {
  return (
    <article className="w-full max-w-[70ch] space-y-14">
      <Section id="getting-started" index={1} title="Getting started">
        <GettingStarted />
      </Section>
      <Section id="supported-apis" index={2} title="Supported APIs">
        <SupportedApis />
      </Section>
      <Section id="api-keys" index={3} title="API keys & security">
        <ApiKeys />
      </Section>
      <Section id="widget-types" index={4} title="Widget types">
        <WidgetTypes />
      </Section>
      <Section id="formatting" index={5} title="Formatting playground">
        <Formatting />
      </Section>
      <Section
        id="refresh-caching"
        index={6}
        title="Refresh, caching & rate limits"
      >
        <RefreshSection />
      </Section>
      <Section
        id="export-templates"
        index={7}
        title="Export, import & templates"
      >
        <ExportTemplates />
      </Section>
      <Section id="shortcuts" index={8} title="Keyboard shortcuts">
        <Shortcuts />
      </Section>
      <Section id="troubleshooting" index={9} title="Troubleshooting">
        <Troubleshooting />
      </Section>
    </article>
  );
}
