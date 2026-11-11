'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LayoutTemplate, Play, Wand2 } from 'lucide-react';
import { TEMPLATES } from '@/lib/templates';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const HowItWorksDialog = dynamic(
  () =>
    import('@/components/how-it-works/HowItWorksDialog').then(
      (m) => m.HowItWorksDialog,
    ),
  { ssr: false },
);

/** Opens the animated walkthrough from the docs page. */
export function WatchHowButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Play className="size-3.5" aria-hidden />
        Watch how it works
      </Button>
      <HowItWorksDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Template picker — uses the same `requestTemplate` loader as the
 * dashboard, then sends you to `/` where the result (or the
 * replace-confirmation dialog) lives.
 */
export function StartFromTemplateButton() {
  const router = useRouter();
  const requestTemplate = useDashboardStore((s) => s.requestTemplate);
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <LayoutTemplate className="size-3.5" aria-hidden />
        Start from a template
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              requestTemplate(t.id);
              router.push('/');
            }}
            className="block w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-raised"
          >
            <span className="block text-sm">{t.name}</span>
            <span className="block text-[11px] text-faint">
              {t.payload.widgets.length} widgets
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Opens the real Add Widget modal prefilled with `url`. */
export function OpenInBuilderButton({ url }: { url: string }) {
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  return (
    <Button
      variant="outline"
      size="xs"
      onClick={() => openAddWidget(url)}
    >
      <Wand2 className="size-3" aria-hidden />
      Open in builder
    </Button>
  );
}
