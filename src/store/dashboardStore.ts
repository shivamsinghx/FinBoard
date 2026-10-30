'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';
import { FINBOARD_STORAGE_KEY } from '@/lib/constants';
import {
  WIDGET_GRID_DEFAULTS,
  WIDGET_TYPE_LABELS,
  type ApiProvider,
  type DashboardExport,
  type ThemeMode,
  type WidgetConfig,
  type WidgetInstance,
  type WidgetLayout,
  type WidgetType,
} from '@/types/widget';

const STORE_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `w-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultConfigFor(type: WidgetType): WidgetConfig {
  const base: WidgetConfig = {
    title: WIDGET_TYPE_LABELS[type],
    provider: 'alpha-vantage' satisfies ApiProvider,
    endpoint: '',
    params: {},
    fields: [],
    refreshIntervalSec: 60,
  };

  switch (type) {
    case 'card':
      return { ...base, card: { kind: 'quote', symbols: [] } };
    case 'table':
      return { ...base, table: { pageSize: 10, sortDir: 'asc' } };
    case 'chart':
      return { ...base, chart: { kind: 'line', interval: 'daily' } };
  }
}

/** Bottom edge of the lowest widget — new widgets are appended beneath it. */
function nextY(widgets: WidgetInstance[]): number {
  return widgets.reduce((y, w) => Math.max(y, w.layout.y + w.layout.h), 0);
}

const WIDGET_TYPES: readonly WidgetType[] = ['card', 'table', 'chart'];

/** Structural validation for an imported widget — throws on bad data. */
function assertWidgetShape(value: unknown): asserts value is WidgetInstance {
  const w = value as WidgetInstance;
  if (!w || typeof w.id !== 'string' || !WIDGET_TYPES.includes(w.type)) {
    throw new Error('invalid widget id/type');
  }
  const l = w.layout;
  if (!l || [l.x, l.y, l.w, l.h].some((n) => typeof n !== 'number')) {
    throw new Error(`widget "${w.id}" has invalid layout`);
  }
  if (!w.config || typeof w.config.title !== 'string') {
    throw new Error(`widget "${w.id}" has invalid config`);
  }
}

function parseDashboardExport(raw: unknown): DashboardExport {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as DashboardExport).widgets)) {
    throw new Error('not a FinBoard export');
  }
  const data = raw as DashboardExport;
  data.widgets.forEach(assertWidgetShape);
  return data;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface DashboardState {
  widgets: WidgetInstance[];
  theme: ThemeMode;

  /** Widget whose config panel is open; transient — not persisted. */
  editingWidgetId: string | null;
  /** True once persisted state has been restored on the client. */
  hasHydrated: boolean;

  addWidget: (
    type: WidgetType,
    overrides?: {
      config?: Partial<WidgetConfig>;
      layout?: Partial<WidgetLayout>;
    },
  ) => string;
  removeWidget: (id: string) => void;
  duplicateWidget: (id: string) => string | null;
  updateWidgetConfig: (id: string, patch: Partial<WidgetConfig>) => void;
  renameWidget: (id: string, title: string) => void;

  /** Sync positions back from react-grid-layout after drag/resize. */
  setLayouts: (layout: Layout) => void;

  openWidgetEditor: (id: string) => void;
  closeWidgetEditor: () => void;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;

  /** Serialize the dashboard to a JSON string for backup/download. */
  exportDashboard: () => string;
  /** Restore a previously exported dashboard. Returns an error message or null. */
  importDashboard: (json: string) => string | null;
  resetDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      theme: 'light',
      editingWidgetId: null,
      hasHydrated: false,

      addWidget: (type, overrides) => {
        const id = createId();
        const defaults = WIDGET_GRID_DEFAULTS[type];
        const widget: WidgetInstance = {
          id,
          type,
          layout: {
            x: 0,
            y: nextY(get().widgets),
            ...defaults,
            ...overrides?.layout,
          },
          config: { ...defaultConfigFor(type), ...overrides?.config },
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ widgets: [...s.widgets, widget], editingWidgetId: id }));
        return id;
      },

      removeWidget: (id) =>
        set((s) => ({
          widgets: s.widgets.filter((w) => w.id !== id),
          editingWidgetId: s.editingWidgetId === id ? null : s.editingWidgetId,
        })),

      duplicateWidget: (id) => {
        const source = get().widgets.find((w) => w.id === id);
        if (!source) return null;
        const clone: WidgetInstance = {
          ...structuredClone(source),
          id: createId(),
          layout: { ...source.layout, y: nextY(get().widgets) },
          config: { ...structuredClone(source.config), title: `${source.config.title} (copy)` },
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ widgets: [...s.widgets, clone] }));
        return clone.id;
      },

      updateWidgetConfig: (id, patch) =>
        set((s) => ({
          widgets: s.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...patch } } : w,
          ),
        })),

      renameWidget: (id, title) => get().updateWidgetConfig(id, { title }),

      setLayouts: (layout) =>
        set((s) => ({
          widgets: s.widgets.map((w) => {
            const item = layout.find((l) => l.i === w.id);
            if (!item) return w;
            const { x, y, w: width, h: height } = item;
            if (x === w.layout.x && y === w.layout.y && width === w.layout.w && height === w.layout.h) {
              return w;
            }
            return { ...w, layout: { ...w.layout, x, y, w: width, h: height } };
          }),
        })),

      openWidgetEditor: (id) => set({ editingWidgetId: id }),
      closeWidgetEditor: () => set({ editingWidgetId: null }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      exportDashboard: () => {
        const { widgets, theme } = get();
        const payload: DashboardExport = {
          version: STORE_VERSION,
          exportedAt: new Date().toISOString(),
          theme,
          widgets,
        };
        return JSON.stringify(payload, null, 2);
      },

      importDashboard: (json) => {
        try {
          const data = parseDashboardExport(JSON.parse(json));
          set({ widgets: data.widgets, theme: data.theme ?? 'light', editingWidgetId: null });
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : 'invalid dashboard file';
        }
      },

      resetDashboard: () => set({ widgets: [], editingWidgetId: null }),
    }),
    {
      name: FINBOARD_STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * localStorage is only touched when `rehydrate()` is called from a
       * client effect (see `useDashboardHydration`), keeping server-rendered
       * markup and first client render identical.
       */
      skipHydration: true,
      partialize: (s) => ({ widgets: s.widgets, theme: s.theme }),
      onRehydrateStorage: () => () => {
        useDashboardStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Hydration hook                                                      */
/* ------------------------------------------------------------------ */

/**
 * Triggers restore of persisted dashboard state. Call once near the root of
 * the dashboard UI; render a skeleton while it returns `false` to avoid a
 * hydration mismatch.
 */
export function useDashboardHydration(): boolean {
  const hasHydrated = useDashboardStore((s) => s.hasHydrated);
  useEffect(() => {
    void useDashboardStore.persist.rehydrate();
  }, []);
  return hasHydrated;
}

/* Convenience selectors */
export const selectWidgets = (s: DashboardState) => s.widgets;
export const selectEditingWidget = (s: DashboardState) =>
  s.widgets.find((w) => w.id === s.editingWidgetId) ?? null;
