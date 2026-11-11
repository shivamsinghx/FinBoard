import { describe, expect, it } from 'vitest';

// zustand persist resolves localStorage at store-module init, so the
// stub must exist before dashboardStore is imported (dynamic import
// below keeps the ordering explicit in node where the global is
// otherwise an experimental getter-only undefined).
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  },
});

describe('templates', () => {
  it('every template passes importDashboard validation', async () => {
    const { TEMPLATES } = await import('@/lib/templates');
    const { useDashboardStore } = await import('@/store/dashboardStore');
    for (const t of TEMPLATES) {
      const err = useDashboardStore
        .getState()
        .importDashboard(JSON.stringify(t.payload));
      expect(err, `template "${t.id}"`).toBeNull();
      expect(
        useDashboardStore.getState().widgets.length,
        `template "${t.id}" widget count`,
      ).toBe(t.payload.widgets.length);
    }
  });
});
