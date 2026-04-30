"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RedemptionBanner({
  slug,
  daysLeft,
}: {
  slug: string;
  daysLeft: number;
}) {
  const dayWord = daysLeft === 1 ? "day" : "days";
  return (
    <div className="rounded-md border border-penitent/50 bg-penitent/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-penitent">
            A second vow offered
          </p>
          <p className="mt-1 font-display text-lg tracking-tight">
            Thou hast fallen — yet the temple grants thee {daysLeft} {dayWord} to reclaim thy place.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk the doubled path: thy daily inputs redouble for the days that
            remain. The outcome thou pledged stands.
          </p>
        </div>
        <Button
          asChild
          className="font-display tracking-widest"
          variant="outline"
        >
          <Link href={`/groups/${slug}/redemption`}>See the penance</Link>
        </Button>
      </div>
    </div>
  );
}
