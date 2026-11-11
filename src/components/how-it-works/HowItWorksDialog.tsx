'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Stage } from './Stage';
import { Controls } from './Controls';
import { DEMO_URL, SCENES, TOTAL_MS, sceneIndexAt } from './timeline';

const TICK_MS = 50;

/**
 * "How it works" — a ~20s auto-playing walkthrough of the widget flow.
 * The clock lives here; scenes render as pure functions of `elapsed`,
 * so pause/seek/reduced-motion all fall out for free.
 */
export function HowItWorksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const openAddWidget = useDashboardStore((s) => s.openAddWidget);
  const reduced = useReducedMotion() ?? false;
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);

  const ended = elapsed >= TOTAL_MS;

  // Reset the clock each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setElapsed(0);
      setPlaying(!reduced);
    }, 0);
    return () => clearTimeout(t);
  }, [open, reduced]);

  // The clock.
  useEffect(() => {
    if (!open || !playing || ended) return;
    const iv = setInterval(
      () => setElapsed((e) => Math.min(e + TICK_MS, TOTAL_MS)),
      TICK_MS,
    );
    return () => clearInterval(iv);
  }, [open, playing, ended]);

  // Auto-pause when the tab hides.
  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [open]);

  const idx = sceneIndexAt(elapsed);
  const caption = ended ? 'Your first widget in under a minute.' : SCENES[idx].caption;

  const togglePlay = () => {
    if (ended) {
      setElapsed(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };
  const prev = () => setElapsed(SCENES[Math.max(0, idx - 1)].start);
  const next = () => {
    if (idx < SCENES.length - 1) setElapsed(SCENES[idx + 1].start);
    else setElapsed(TOTAL_MS);
  };

  const tryItNow = () => {
    onOpenChange(false);
    openAddWidget(DEMO_URL);
  };

  const endScreen = (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <p className="font-display text-[22px] tracking-tight">
        Your first widget in under a minute.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={tryItNow}>
          <Play className="size-3.5" aria-hidden />
          Try it now
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setElapsed(0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[760px]">
        <div className="px-5 pt-5">
          <DialogTitle className="text-base">How it works</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Any finance API → live widgets, in about a minute.
          </DialogDescription>
        </div>

        <div className="px-5 pt-4">
          <Stage
            elapsed={elapsed}
            animated={!reduced}
            ended={ended}
            endScreen={endScreen}
          />
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{caption}</p>
          <Controls
            elapsed={elapsed}
            playing={playing && !ended}
            ended={ended}
            reduced={reduced}
            onSeek={(ms) => {
              setElapsed(ms);
              if (!reduced) setPlaying(true);
            }}
            onTogglePlay={togglePlay}
            onSkip={() => setElapsed(TOTAL_MS)}
            onPrev={prev}
            onNext={next}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
