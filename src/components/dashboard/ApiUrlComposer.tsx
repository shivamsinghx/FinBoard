'use client';

import { useState, type FormEvent } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';

interface ApiUrlComposerProps {
  /** `hero` = large centered pill on the empty state; `nav` = compact header pill. */
  size?: 'hero' | 'nav';
}

export function ApiUrlComposer({ size = 'hero' }: ApiUrlComposerProps) {
  const [url, setUrl] = useState('');
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const hero = size === 'hero';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    openAddWidget(url.trim() || undefined);
    setUrl('');
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`items-center rounded-full border border-subtle bg-surface ${
        hero
          ? 'flex h-14 w-[380px] max-w-full pl-5 pr-1.5 shadow-[0_10px_40px_rgba(20,20,20,0.07)]'
          : 'hidden h-9 pl-3.5 pr-1 sm:flex' // toolbar's Add widget covers small screens
      }`}
    >
      <label htmlFor={hero ? 'hero-api-url' : 'nav-api-url'} className="sr-only">
        Finance API URL
      </label>
      <input
        id={hero ? 'hero-api-url' : 'nav-api-url'}
        type="text"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={hero ? 'Paste a finance API URL' : 'Paste API URL'}
        className={`min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint ${
          hero ? 'text-base' : 'w-28 text-xs'
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-full bg-linear-to-r from-accent via-[#4CC36E] to-[#A8E063] font-medium text-accent-contrast [text-shadow:0_1px_1px_rgba(4,60,40,0.35)] transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          hero ? 'px-5 py-2.5 text-base' : 'px-3 py-1.5 text-xs'
        }`}
      >
        Add widget
      </button>
    </form>
  );
}
