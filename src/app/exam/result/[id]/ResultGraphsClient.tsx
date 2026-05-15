"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

export default function ResultGraphsClient({
  accuracy,
  gradeColor,
  gradeLabel,
  correctCount,
  wrongCount,
  skippedCount,
  totalCount,
}: {
  accuracy: number;
  gradeColor: string;
  gradeLabel: string;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalCount: number;
}) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (accuracy / 100) * circ;

  return (
    <Dialog>
      <div className="relative">
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="absolute -top-2 -right-2 z-10 h-8 w-8 bg-background/80 backdrop-blur"
            aria-label="Open result graph fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>

        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={gradeColor}
              strokeWidth="10"
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="relative flex flex-col items-center">
            <span className="text-2xl font-black tabular-nums leading-none" style={{ color: gradeColor }}>
              {accuracy}%
            </span>
            <span className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
              {gradeLabel}
            </span>
          </div>
        </div>
      </div>

      <DialogContent className="max-w-[94vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Result Graph</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 p-1">
          <div className="mx-auto relative flex h-60 w-60 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={gradeColor}
                strokeWidth="8"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="relative text-center">
              <p className="text-5xl font-black tabular-nums" style={{ color: gradeColor }}>{accuracy}%</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{gradeLabel}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex h-3 overflow-hidden rounded-full bg-border">
              <div style={{ width: `${(correctCount / Math.max(1, totalCount)) * 100}%`, background: "oklch(0.55 0.13 165)" }} />
              <div style={{ width: `${(wrongCount / Math.max(1, totalCount)) * 100}%`, background: "oklch(0.52 0.22 27)" }} />
              <div style={{ width: `${(skippedCount / Math.max(1, totalCount)) * 100}%`, background: "oklch(0.62 0.14 78)" }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <p className="font-semibold" style={{ color: "oklch(0.35 0.13 168)" }}>Correct {correctCount}</p>
              <p className="font-semibold" style={{ color: "oklch(0.45 0.22 27)" }}>Wrong {wrongCount}</p>
              <p className="font-semibold" style={{ color: "oklch(0.42 0.14 75)" }}>Skipped {skippedCount}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

