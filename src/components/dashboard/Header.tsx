'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { ApiUrlComposer } from './ApiUrlComposer';

export function Header() {
  const importDashboard = useDashboardStore((s) => s.importDashboard);
  const fileRef = useRef<HTMLInputElement>(null);

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      const err = importDashboard(text);
      if (err) console.error('Dashboard import failed:', err);
    });
    e.target.value = '';
  }

  return (
    <header className="relative z-20 mx-auto flex h-16 w-full max-w-6xl items-center justify-between pl-5 pr-5 sm:pl-8 sm:pr-6">
      <Link href="/" className="flex items-center gap-2">
        <LayoutDashboard className="size-5 text-ink" aria-hidden />
        <span className="text-[22px] font-medium tracking-tight">FinBoard</span>
      </Link>

      <nav
        aria-label="Primary"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex"
      >
        <button
          type="button"
          className="text-sm text-ink/85 transition-colors hover:text-ink"
          onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Templates
        </button>
        <a href="#how-it-works" className="text-sm text-ink/85 transition-colors hover:text-ink">
          How it works
        </a>
        <a href="#docs" className="text-sm text-ink/85 transition-colors hover:text-ink">
          Docs
        </a>
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="hidden text-sm text-ink/85 transition-colors hover:text-ink sm:block"
        >
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import dashboard configuration"
          onChange={onImportFile}
        />

        <ApiUrlComposer size="nav" />
      </div>
    </header>
  );
}
