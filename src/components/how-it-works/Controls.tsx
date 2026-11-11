'use client';

import { ChevronLeft, ChevronRight, Pause, Play, SkipForward } from 'lucide-react';
import { SCENES, TOTAL_MS, clamp01, sceneIndexAt } from './timeline';
import { Button } from '@/components/ui/button';

/**
 * Controls row — segmented progress (click to seek a scene), Play/Pause,
 * Skip. In reduced-motion mode it degrades to Back / Next frame steps.
 */
export function Controls({
  elapsed,
  playing,
  ended,
  reduced,
  onSeek,
  onTogglePlay,
  onSkip,
  onPrev,
  onNext,
}: {
  elapsed: number;
  playing: boolean;
  ended: boolean;
  reduced: boolean;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const active = sceneIndexAt(elapsed);

  if (reduced) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onPrev}
          disabled={active === 0 && !ended}
          aria-label="Previous scene"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Back
        </Button>
        <span className="text-[11px] text-faint">
          {ended ? SCENES.length + 1 : active + 1} / {SCENES.length + 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onNext}
          disabled={ended}
          aria-label="Next scene"
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex flex-1 gap-1"
        role="group"
        aria-label="Walkthrough progress"
      >
        {SCENES.map((s, i) => {
          const fill = clamp01((elapsed - s.start) / (s.end - s.start));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSeek(s.start)}
              aria-label={`Scene ${i + 1}: ${s.caption}`}
              className={`relative h-1.5 flex-1 overflow-hidden rounded-full transition-colors ${
                i === active ? 'bg-accent/25' : 'bg-raised'
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent"
                style={{ width: `${fill * 100}%` }}
              />
            </button>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onTogglePlay}
        aria-label={playing ? 'Pause' : elapsed >= TOTAL_MS ? 'Replay' : 'Play'}
      >
        {playing ? (
          <Pause className="size-3.5" aria-hidden />
        ) : (
          <Play className="size-3.5" aria-hidden />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={onSkip}
        disabled={ended}
        aria-label="Skip to end"
      >
        <SkipForward className="size-3.5" aria-hidden />
        Skip
      </Button>
    </div>
  );
}
