"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markOutcomeShippedAction } from "@/app/(app)/groups/[slug]/pledge/actions";
import { cn } from "@/lib/utils";

interface OutcomeBlockProps {
  slug: string;
  outcomeText: string;
  achievedAt: string | null;
  canEdit: boolean;
  variant?: "card" | "compact";
}

export function OutcomeBlock({
  slug,
  outcomeText,
  achievedAt,
  canEdit,
  variant = "card",
}: OutcomeBlockProps) {
  const [isPending, startTransition] = useTransition();
  const shipped = Boolean(achievedAt);
  const trimmed = outcomeText.trim();

  function toggle() {
    startTransition(async () => {
      try {
        await markOutcomeShippedAction({ slug, shipped: !shipped });
        toast.success(
          shipped ? "Outcome unmarked." : "Outcome shipped — kudos.",
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update outcome.",
        );
      }
    });
  }

  if (!trimmed) {
    if (!canEdit) return null;
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-gold/40 bg-gold/5 p-3",
          variant === "compact" && "p-2",
        )}
      >
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Month&apos;s end outcome
        </p>
        <p className="mt-1 text-sm italic text-muted-foreground">
          Name what thou shalt ship on May 31 — a recital, a release, an
          exhibition.
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="mt-2 font-display tracking-widest"
        >
          <Link href={`/groups/${slug}/pledge/edit`}>Inscribe outcome</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border p-3 transition",
        shipped
          ? "border-divine/50 bg-divine/10"
          : "border-gold/40 bg-gold/5",
        variant === "compact" && "p-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {shipped ? (
            <Trophy className="h-3 w-3 text-gold" />
          ) : (
            <Sparkles className="h-3 w-3 text-gold" />
          )}
          {shipped ? "Shipped" : "Month's end outcome"}
        </p>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            variant={shipped ? "ghost" : "outline"}
            onClick={toggle}
            disabled={isPending}
            className="h-7 font-display text-xs tracking-widest"
          >
            {isPending
              ? "…"
              : shipped
                ? "Unmark"
                : "Mark shipped"}
          </Button>
        )}
      </div>
      <p
        className={cn(
          "mt-1 text-sm",
          shipped && "text-muted-foreground line-through",
        )}
      >
        {trimmed}
      </p>
    </div>
  );
}
