'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Download,
  FilePlus2,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import {
  exportDashboardJson,
  pickAndImportDashboard,
  refreshAllWidgets,
} from '@/lib/dashboardActions';
import { TEMPLATES } from '@/lib/templates';
import { DOC_SECTIONS } from '@/lib/docsSections';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ApiUrlComposer } from './ApiUrlComposer';

/** The walkthrough is heavy (motion + four scenes) — load on demand. */
const HowItWorksDialog = dynamic(
  () =>
    import('@/components/how-it-works/HowItWorksDialog').then(
      (m) => m.HowItWorksDialog,
    ),
  { ssr: false },
);

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const requestTemplate = useDashboardStore((s) => s.requestTemplate);
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const resetDashboard = useDashboardStore((s) => s.resetDashboard);
  const widgetCount = useDashboardStore((s) => s.widgets.length);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paletteAction = (fn: () => void) => () => {
    setPaletteOpen(false);
    fn();
  };

  return (
    <header className="relative z-20 mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
      <Link
        href="/"
        className="flex items-center gap-2"
        onClick={(e) => {
          if (pathname === '/' && widgetCount > 0) {
            // Going "home" means the hero — which requires clearing the
            // board, so confirm before wiping anything.
            e.preventDefault();
            setResetOpen(true);
            return;
          }
          if (pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      >
        <LayoutDashboard className="size-5 text-ink" aria-hidden />
        <span className="text-[22px] font-medium tracking-tight">FinBoard</span>
      </Link>

      <nav
        aria-label="Primary"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex"
      >
        <button
          type="button"
          onClick={() => setHowOpen(true)}
          className="text-sm text-ink/85 transition-colors hover:text-ink"
        >
          How it works
        </button>
        <Link href="/docs" className="text-sm text-ink/85 transition-colors hover:text-ink">
          Docs
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          className="hidden items-center gap-2 rounded-lg border border-subtle bg-surface px-2.5 py-1.5 text-xs text-faint transition-colors hover:border-strong hover:text-muted sm:flex"
        >
          <Search className="size-3.5" aria-hidden />
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </button>

        <ApiUrlComposer size="nav" />

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu className="size-4.5" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>FinBoard</SheetTitle>
              <SheetDescription className="sr-only">Menu</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-4 pb-6">
              <div className="pt-1">
                {[
                  { label: 'Import dashboard', icon: Upload, fn: pickAndImportDashboard },
                  { label: 'Export dashboard', icon: Download, fn: exportDashboardJson },
                  { label: 'Refresh all widgets', icon: RefreshCw, fn: refreshAllWidgets },
                  { label: 'Add widget', icon: FilePlus2, fn: () => openAddWidget() },
                ].map(({ label, icon: Icon, fn }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      fn();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink/85 transition-colors hover:bg-raised hover:text-ink"
                  >
                    <Icon className="size-4 text-faint" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-subtle/60 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setHowOpen(true);
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm text-ink/85 transition-colors hover:bg-raised"
                >
                  How it works
                </button>
                <Link href="/docs" onClick={() => setMenuOpen(false)} className="block rounded-lg px-2 py-2 text-sm text-ink/85 transition-colors hover:bg-raised">
                  Docs
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <CommandDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        title="Command palette"
        description="Run a dashboard action"
      >
        <CommandInput placeholder="Type a command…" />
        <CommandList>
          <CommandEmpty>No matching command.</CommandEmpty>
          <CommandGroup heading="Dashboard">
            <CommandItem onSelect={paletteAction(() => openAddWidget())}>
              <FilePlus2 className="size-4" aria-hidden />
              Add widget
            </CommandItem>
            <CommandItem onSelect={paletteAction(refreshAllWidgets)}>
              <RefreshCw className="size-4" aria-hidden />
              Refresh all widgets
            </CommandItem>
            <CommandItem onSelect={paletteAction(exportDashboardJson)}>
              <Download className="size-4" aria-hidden />
              Export dashboard
            </CommandItem>
            <CommandItem onSelect={paletteAction(pickAndImportDashboard)}>
              <Upload className="size-4" aria-hidden />
              Import dashboard
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Templates">
            {TEMPLATES.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={paletteAction(() => requestTemplate(t.id))}
              >
                <LayoutTemplate className="size-4" aria-hidden />
                Load template: {t.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Docs">
            {DOC_SECTIONS.map((s) => (
              <CommandItem
                key={s.id}
                keywords={s.keywords}
                onSelect={paletteAction(() =>
                  router.push(`/docs#${s.id}`),
                )}
              >
                <BookOpen className="size-4" aria-hidden />
                Docs: {s.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <HowItWorksDialog open={howOpen} onOpenChange={setHowOpen} />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Back to the start screen?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your {widgetCount}{' '}
              {widgetCount === 1 ? 'widget' : 'widgets'} and shows the empty
              dashboard again. Export first if you want to keep a copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setResetOpen(false);
                resetDashboard();
                window.scrollTo({ top: 0 });
              }}
            >
              Clear dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
