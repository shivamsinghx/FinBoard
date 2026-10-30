'use client';

import { useEffect, type ReactNode } from 'react';
import { useDashboardHydration, useDashboardStore } from '@/store/dashboardStore';

/**
 * Keeps the `dark` class on <html> in sync with the store's theme.
 * Also triggers dashboard rehydration so the store reflects localStorage
 * before it applies anything — the pre-paint state from ThemeScript is
 * authoritative until then.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useDashboardStore((s) => s.theme);
  const hasHydrated = useDashboardHydration();

  useEffect(() => {
    if (!hasHydrated) return;
    const dark = theme === 'dark';
    const el = document.documentElement;
    el.classList.toggle('dark', dark);
    el.style.colorScheme = dark ? 'dark' : 'light';
  }, [theme, hasHydrated]);

  return children;
}
