'use client';

import { Moon, Sun } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

/** Light/dark switch — flips the store theme ThemeProvider applies. */
export function ThemeToggle() {
  const theme = useDashboardStore((s) => s.theme);
  const toggleTheme = useDashboardStore((s) => s.toggleTheme);
  const dark = theme === 'dark';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full text-ink/85 transition-colors hover:bg-raised hover:text-ink"
    >
      {dark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
