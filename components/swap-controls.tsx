"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSounds } from "@/hooks/use-sounds";
import {
  acceptSwitchAction,
  cancelSwitchAction,
  declineSwitchAction,
  proposeSwitchAction,
} from "@/app/(app)/groups/[slug]/swap/actions";

export interface SwapPartner {
  userId: string;
  displayName: string;
}

export interface PendingSwap {
  swapId: string;
  initiatorUserId: string;
  initiatorName: string;
  targetUserId: string;
  targetName: string;
  // Whether the current viewer is the receiver (target) of this offer.
  amTarget: boolean;
}

export interface ActiveSwap {
  swapId: string;
  partnerName: string;
}

interface SwapControlsProps {
  slug: string;
  // Other members the viewer can switch with (excludes self, no-pledge mortals are still allowed; the dialog is for committing publicly).
  candidates: SwapPartner[];
  pending: PendingSwap[];
  active: ActiveSwap | null;
  // True if there is no challenge today (before May or after May), or any other reason the viewer cannot invoke.
  disabledReason: string | null;
}

export function SwapControls({
  slug,
  candidates,
  pending,
  active,
  disabledReason,
}: SwapControlsProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(candidates[0]?.userId ?? "");
  const [isPending, startTransition] = useTransition();
  const playSound = useSounds();

  function propose() {
    if (!target) {
      toast.error("Choose a mortal to switch with.");
      return;
    }
    startTransition(async () => {
      try {
        await proposeSwitchAction({ slug, targetUserId: target });
        playSound("switchOffered");
        toast.success("Offer cast into the air.");
        setOpen(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not offer";
        toast.error(msg);
      }
    });
  }

  function respond(swap: PendingSwap, action: "accept" | "decline" | "cancel") {
    startTransition(async () => {
      try {
        if (action === "accept") {
          await acceptSwitchAction({ swapId: swap.swapId });
          playSound("switchAccepted");
          toast.success("The Switching is upon thee.");
        } else if (action === "decline") {
          await declineSwitchAction({ swapId: swap.swapId });
          toast.success("Offer declined.");
        } else {
          await cancelSwitchAction({ swapId: swap.swapId });
          toast.success("Offer withdrawn.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not respond";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {pending.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-divine/40 bg-divine/10 p-4">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-divine">
            Pending offers
          </p>
          {pending.map((p) => (
            <div
              key={p.swapId}
              className="flex flex-col gap-2 rounded-md border border-border/40 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm">
                {p.amTarget ? (
                  <>
                    <span className="font-display tracking-wide">
                      {p.initiatorName}
                    </span>{" "}
                    proposeth to switch goals with thee today. Wilt thou accept
                    chaos?
                  </>
                ) : (
                  <>
                    Thou hast offered to switch with{" "}
                    <span className="font-display tracking-wide">
                      {p.targetName}
                    </span>
                    . Awaiting their answer.
                  </>
                )}
              </p>
              <div className="flex gap-2">
                {p.amTarget ? (
                  <>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => respond(p, "accept")}
                      className="gilded font-display tracking-widest"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => respond(p, "decline")}
                      className="font-display tracking-widest"
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => respond(p, "cancel")}
                    className="font-display tracking-widest"
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              disabled={Boolean(disabledReason) || Boolean(active) || candidates.length === 0}
              className="font-display tracking-widest"
              title={
                disabledReason ??
                (active
                  ? "Thou art already switched today."
                  : candidates.length === 0
                    ? "No other mortals to switch with."
                    : undefined)
              }
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Invoke The Switching
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest">
              Invoke The Switching
            </DialogTitle>
            <DialogDescription>
              For this day only — thou shalt walk in another&apos;s vow, and
              they in thine. Strikes and streaks remain on thy own ledger; the
              labour shifts. Once accepted, the swap is sealed for the day.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                With whom?
              </span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={isPending}
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {candidates.length === 0 ? (
                  <option value="">No other mortals here</option>
                ) : (
                  candidates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.displayName}
                    </option>
                  ))
                )}
              </select>
            </label>
            <p className="rounded-md border border-fallen/30 bg-fallen/5 p-3 text-xs italic text-muted-foreground">
              The other mortal must accept ere the switch takes hold. Until
              then, thy daily rite stands as written.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Hold</Button>} />
            <Button
              type="button"
              onClick={propose}
              disabled={isPending || !target}
              className="gilded font-display tracking-widest"
            >
              {isPending ? "Casting…" : "Cast the offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
