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
    <header className="relative z-20 grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2 justify-self-start">
        <LayoutDashboard className="size-5 text-ink" aria-hidden />
        <span className="text-[22px] font-medium tracking-tight">FinBoard</span>
      </Link>

      <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
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

      <div className="flex items-center gap-5 justify-self-end">
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
