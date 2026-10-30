'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface EmailCaptureProps {
  /** `nav` is the compact navbar variant; `hero` is the large centered form. */
  size?: 'nav' | 'hero';
}

export function EmailCapture({ size = 'hero' }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const nav = size === 'nav';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) setDone(true);
  }

  if (done) {
    return (
      <p
        className={`flex items-center gap-2 font-medium text-accent ${nav ? 'text-xs' : 'rounded-full border border-subtle bg-surface px-6 py-3.5 text-sm'}`}
        role="status"
      >
        <Check className={nav ? 'size-3.5' : 'size-4'} aria-hidden />
        {nav ? 'In!' : "You're on the list — talk soon."}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`flex items-center rounded-full border border-subtle bg-surface ${
        nav ? 'p-0.5 pl-3' : 'w-full max-w-md gap-1 p-1.5 pl-5'
      }`}
    >
      <label htmlFor={nav ? 'nav-email' : 'hero-email'} className="sr-only">
        Email address
      </label>
      <input
        id={nav ? 'nav-email' : 'hero-email'}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={nav ? 'Email' : 'you@fund.com'}
        className={`min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint ${
          nav ? 'w-28 text-xs' : 'text-sm'
        }`}
      />
      <button
        type="submit"
        className={`flex shrink-0 items-center gap-1.5 rounded-full bg-accent font-medium text-accent-contrast transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          nav ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
        }`}
      >
        {nav ? 'Go' : 'Get started'}
        {!nav && <ArrowRight className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
