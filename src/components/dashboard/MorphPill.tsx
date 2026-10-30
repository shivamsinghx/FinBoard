'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface MorphSlot {
  word: string;
  /** Lucide icon — used when no `img` is given. */
  icon?: LucideIcon;
  /** Image path (e.g. /icons/x.png) — rendered as the full tile. */
  img?: string;
}

interface MorphPillProps {
  /** Words + their icons cycled through this pill. */
  slots: MorphSlot[];
  /** Icon tile colors. */
  tint: { bg: string; fg: string };
  /** Currently shown slot (controlled by `useMorphSequence`). */
  index: number;
  /** Advance to the next slot (hover/focus/click). */
  onNext: () => void;
}

/**
 * Drives a group of pills on a continuous loop: every `step` ms the next
 * pill (left to right, wrapping) swaps its word, so sibling pills never
 * morph at the same moment. Returns current indices and `advance(pill)`.
 */
export function useMorphSequence(lengths: number[], step = 870) {
  const [indices, setIndices] = useState(() => lengths.map(() => 0));
  const key = lengths.join(',');

  useEffect(() => {
    const lens = key.split(',').map(Number);
    let tick = 0;
    const iv = setInterval(() => {
      const p = tick++ % lens.length;
      setIndices((cur) => cur.map((v, j) => (j === p ? (v + 1) % lens[p] : v)));
    }, step);
    return () => clearInterval(iv);
  }, [key, step]);

  const advance = (p: number) =>
    setIndices((cur) => cur.map((v, j) => (j === p ? (v + 1) % lengths[p] : v)));

  return [indices, advance] as const;
}

/* Exit: quick ease-in squash + blur. Enter: waits for the exit to start,
   then springs in with the overshoot curve from the design spec. */
const ENTER =
  'duration-500 delay-100 ease-[cubic-bezier(.3,1.6,.4,1)] scale-100 opacity-100 blur-0';
const EXIT = 'duration-200 ease-in opacity-0';
const GPU = 'transform-gpu will-change-[transform,opacity,filter] transition-all';

/**
 * Inline pill that cycles a word + icon. The word track animates its width
 * to the measured width of the incoming word, so the pill resizes smoothly
 * instead of snapping. Reduced motion falls back to a plain crossfade.
 */
export function MorphPill({ slots, tint, index, onNext: next }: MorphPillProps) {
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [widths, setWidths] = useState<number[]>([]);

  useLayoutEffect(() => {
    const measure = () =>
      setWidths(wordRefs.current.map((el) => el?.scrollWidth ?? 0));
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [slots]);

  return (
    <button
      type="button"
      onMouseEnter={next}
      onFocus={next}
      onClick={next}
      className="mx-1 inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] py-1 pr-3.5 pl-1.5 align-middle leading-[1.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(17,17,17,0.06),0_6px_14px_-6px_rgba(17,17,17,0.18)] transition-[background-color,box-shadow] hover:bg-ink/[0.09] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(17,17,17,0.08),0_8px_18px_-6px_rgba(17,17,17,0.22)]"
    >
      <span
        className={`relative flex size-[1.5em] shrink-0 items-center justify-center ${
          slots[index].img ? '' : 'rounded-full'
        }`}
        style={slots[index].img ? undefined : { backgroundColor: tint.bg, color: tint.fg }}
      >
        {slots.map((slot, si) => {
          const cls = `absolute ${GPU} ${
            si === index
              ? ENTER
              : `${EXIT} scale-50 motion-reduce:scale-100`
          }`;
          const Icon = slot.icon;
          return slot.img ? (
            <Image
              key={slot.word}
              src={slot.img}
              alt=""
              width={64}
              height={64}
              draggable={false}
              className={`${cls} size-full object-contain`}
            />
          ) : Icon ? (
            <Icon key={slot.word} aria-hidden className={`${cls} size-[0.6em]`} />
          ) : null;
        })}
      </span>
      <span className="sr-only">{slots[0].word}</span>
      <span
        aria-hidden
        className="relative inline-flex items-center whitespace-nowrap transition-[width] duration-500 ease-[cubic-bezier(.3,1.25,.4,1)] motion-reduce:transition-none"
        style={widths[index] ? { width: widths[index] } : undefined}
      >
        {slots.map((slot, si) => (
          <span
            key={slot.word}
            ref={(el) => {
              wordRefs.current[si] = el;
            }}
            className={`whitespace-nowrap ${GPU} ${
              si === index
                ? `relative ${ENTER}`
                : `absolute top-1/2 left-0 -translate-y-1/2 scale-x-90 scale-y-[0.55] blur-[3px] ${EXIT} motion-reduce:scale-100 motion-reduce:blur-none`
            }`}
          >
            {slot.word}
          </span>
        ))}
      </span>
    </button>
  );
}
