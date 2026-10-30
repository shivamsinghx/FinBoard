import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { EmailCapture } from './EmailCapture';
import { LogoWall } from './LogoWall';

/* ------------------------------------------------------------------ */
/* Spreadsheet-cell mosaic accents                                     */
/* ------------------------------------------------------------------ */

/** Pastel fills — lavender, mint, peach, yellow, coral. */
const CELLS = ['#d9c9f2', '#a9ddd3', '#f6b98e', '#f3e3a6', '#e2765c'] as const;

/** A bar is {w: px width, x: px offset from edge (negative bleeds off), c?: color override}. */
type Bar = { w: number; x?: number; c?: number };
interface Stack {
  c: number;
  bars: Bar[];
}

/** Varied-width pill bars per side — like cell ranges bleeding off the page. */
const LEFT_STACKS: Stack[] = [
  { c: 0, bars: [{ w: 104, x: -16 }, { w: 64 }, { w: 88, x: 10 }, { w: 56 }, { w: 76, x: 4 }] },
  { c: 4, bars: [{ w: 72, x: -8 }, { w: 96, x: 6 }, { w: 60 }, { w: 84, x: 12, c: 0 }] },
  { c: 1, bars: [{ w: 92, x: -12 }, { w: 108, x: 6 }, { w: 68 }, { w: 84, x: 10, c: 4 }, { w: 56 }] },
];

const RIGHT_STACKS: Stack[] = [
  { c: 2, bars: [{ w: 88, x: -14 }, { w: 108, x: 8 }, { w: 64 }, { w: 80, x: 4, c: 4 }] },
  { c: 4, bars: [{ w: 96, x: -10 }, { w: 72 }, { w: 88, x: 10 }, { w: 56, c: 2 }] },
  { c: 3, bars: [{ w: 76, x: -12 }, { w: 100, x: 6 }, { w: 60 }, { w: 84, x: 8 }] },
];

function MosaicCluster({ side }: { side: 'left' | 'right' }) {
  const left = side === 'left';
  const stacks = left ? LEFT_STACKS : RIGHT_STACKS;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute hidden flex-col gap-14 xl:flex dark:opacity-40 ${
        left
          ? 'left-0 top-[9%] [mask-image:linear-gradient(90deg,transparent,black_45%)]'
          : 'right-0 top-[7%] [mask-image:linear-gradient(270deg,transparent,black_45%)]'
      }`}
    >
      {stacks.map((stack, si) => (
        <div
          key={si}
          className={`flex flex-col gap-2.5 ${left ? 'items-start' : 'items-end'}`}
        >
          {stack.bars.map((bar, bi) => (
            <span
              key={bi}
              className="block h-3 rounded-full"
              style={{
                width: bar.w,
                backgroundColor: CELLS[bar.c ?? stack.c],
                [left ? 'marginLeft' : 'marginRight']: bar.x ?? 0,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero section                                                        */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Templates', href: '#templates' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '#docs' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-hero-canvas sm:rounded-[2.5rem]">
      {/* three-zone navbar */}
      <nav
        aria-label="Primary"
        className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-5 lg:px-10"
      >
        <Link href="/" className="font-display text-2xl tracking-tight">
          FinBoard
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-5">
          <a
            href="#signin"
            className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
          >
            Sign in
          </a>
          <div className="hidden lg:block">
            <EmailCapture size="nav" />
          </div>
          <a
            href="#signup"
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover lg:hidden"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* spreadsheet-cell mosaics hugging the edges */}
      <MosaicCluster side="left" />
      <MosaicCluster side="right" />

      {/* centered hero column */}
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <h1 className="font-display text-[clamp(3.25rem,9vw,6.75rem)] leading-[1.02] tracking-tight">
          Every ticker.
          <br />
          <em>One board.</em>
        </h1>
        <p className="mt-6 text-base text-muted sm:text-lg">
          Connect any finance API. Watch it live.
        </p>
        <div className="mt-9 flex w-full justify-center">
          <EmailCapture />
        </div>
      </div>

      {/* customer wordmark wall — inside the rounded canvas */}
      <LogoWall />

      {/* floating chat bubble */}
      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-6 right-6 z-10 flex size-12 items-center justify-center rounded-full bg-accent text-accent-contrast transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MessageCircle className="size-5" aria-hidden />
      </button>
    </section>
  );
}
