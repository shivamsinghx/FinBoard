import type { WidgetInstance } from '@/types/widget';

/** Query params that may carry a provider API key in a widget URL. */
const KEY_PARAMS = ['token', 'apikey'] as const;

/** Alpha Vantage's public `demo` placeholder is not a real key. */
const isEmbeddedKey = (v: string | null): v is string => !!v && v !== 'demo';

/** How many widgets carry an embedded (non-demo) key in their endpoint. */
export function countKeyedWidgets(widgets: WidgetInstance[]): number {
  let n = 0;
  for (const w of widgets) {
    try {
      const u = new URL(w.config.endpoint);
      if (KEY_PARAMS.some((p) => isEmbeddedKey(u.searchParams.get(p)))) n += 1;
    } catch {
      /* unparseable endpoint — nothing to scan */
    }
  }
  return n;
}

/**
 * Re-serialize an export payload with key params removed from widget URLs.
 * `apikey=demo` is left alone; unparseable endpoints pass through as-is.
 */
export function stripKeysFromExport(json: string): string {
  const payload = JSON.parse(json) as { widgets: WidgetInstance[] };
  const widgets = payload.widgets.map((w) => {
    try {
      const u = new URL(w.config.endpoint);
      let touched = false;
      for (const p of KEY_PARAMS) {
        if (isEmbeddedKey(u.searchParams.get(p))) {
          u.searchParams.delete(p);
          touched = true;
        }
      }
      return touched
        ? { ...w, config: { ...w.config, endpoint: u.toString() } }
        : w;
    } catch {
      return w;
    }
  });
  return JSON.stringify({ ...payload, widgets }, null, 2);
}
