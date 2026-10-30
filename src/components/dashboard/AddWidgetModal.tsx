'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { WIDGET_TYPE_LABELS, type WidgetType } from '@/types/widget';

const TYPE_ORDER: WidgetType[] = ['card', 'table', 'chart'];

export function AddWidgetModal() {
  const open = useDashboardStore((s) => s.addWidgetOpen);
  const prefill = useDashboardStore((s) => s.addWidgetPrefill);

  if (!open) return null;
  return <ModalPanel initialUrl={prefill} />;
}

/** Mounted only while the modal is open, so state resets per open. */
function ModalPanel({ initialUrl }: { initialUrl: string }) {
  const closeAddWidget = useDashboardStore((s) => s.closeAddWidget);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAddWidget();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAddWidget]);

  function create(type: WidgetType) {
    addWidget(type, { config: { endpoint: url.trim() } });
    closeAddWidget();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add widget"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={closeAddWidget}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-subtle bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl">Add widget</h2>
          <button
            type="button"
            onClick={closeAddWidget}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <label
          htmlFor="widget-api-url"
          className="mt-5 block text-xs font-medium uppercase tracking-wide text-muted"
        >
          API URL
        </label>
        <input
          id="widget-api-url"
          type="text"
          inputMode="url"
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/quote?symbol=AAPL"
          className="mt-2 w-full rounded-lg border border-subtle bg-raised px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
        />

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">
          Widget type
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => create(type)}
              className="rounded-lg border border-subtle bg-raised px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              {WIDGET_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
