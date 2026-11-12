# FinBoard

Turn any finance API into live cards, watchlists, tables and charts — arranged your way. Paste an API URL, test and inspect the JSON, pick fields or a list, and FinBoard builds a refreshable widget on a customizable dashboard.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API keys (optional)

Widgets work without keys on Coinbase endpoints and Alpha Vantage's
`apikey=demo`. For live Finnhub and Alpha Vantage data, add free keys to
`.env.local` at the repo root:

```bash
FINNHUB_API_KEY=your_finnhub_key        # finnhub.io → dashboard → API key
ALPHA_VANTAGE_API_KEY=your_av_key       # alphavantage.co → claim free API key
```

Requests go through `app/api/proxy/route.ts`, which injects the matching key
server-side — keys never reach the browser. The proxy only adds a key when the
widget URL doesn't already carry one, so users can put their own `&token=` /
`&apikey=` in a URL to use their own quota.

**Restart the dev server after changing `.env.local`.**

## Stack

Next.js App Router · React · TypeScript · Tailwind CSS v4 · Zustand
(localStorage persistence) · TanStack Table · Recharts +
lightweight-charts · Vitest.
