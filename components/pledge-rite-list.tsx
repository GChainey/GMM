"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckinRow } from "@/components/checkin-row";
import { useDayCelebration } from "@/components/day-celebration";
import { toggleCheckinAction } from "@/app/(app)/check-in/actions";
import { useSounds } from "@/hooks/use-sounds";
import { cn } from "@/lib/utils";

type Kind = "do" | "abstain" | "weekly_tally" | "monthly_total";

export interface RiteRowProps {
  activityId: string;
  userId: string;
  kind: Kind;
  label: string;
  description: string;
  groupName: string;
  date: string;
  initialCompleted: boolean;
  initialAmount: number | null;
  initialPhotoUrl: string | null;
  unit?: string | null;
  target?: number | null;
  monthTotalSoFar?: number;
  weekDoneSoFar?: number;
  weekTarget?: number | null;
  weekStartIso?: string;
  weekEndIso?: string;
}

interface PledgeRiteListProps {
  date: string;
  rites: RiteRowProps[];
}

export function PledgeRiteList({ date, rites }: PledgeRiteListProps) {
  const router = useRouter();
  const playSound = useSounds();
  const dayCelebration = useDayCelebration();
  const [isMarking, startMarking] = useTransition();
  const [allMarked, setAllMarked] = useState(false);

  const togglable = useMemo(
    () =>
      rites.filter(
        (r) => r.kind === "do" || r.kind === "abstain" || r.kind === "weekly_tally",
      ),
    [rites],
  );
  const outstanding = togglable.filter((r) => !r.initialCompleted);
  const hasOutstanding = outstanding.length > 0 && !allMarked;

  function markAll() {
    if (outstanding.length === 0) return;
    startMarking(async () => {
      const results = await Promise.allSettled(
        outstanding.map((r) =>
          toggleCheckinAction({
            activityId: r.activityId,
            date,
            completed: true,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          dayCelebration?.setCompletion(outstanding[i].activityId, true);
        }
      });
      if (failed === 0) {
        playSound("riteChecked");
        toast.success(
          outstanding.length === 1
            ? "Rite marked complete"
            : `${outstanding.length} rites marked complete`,
        );
        setAllMarked(true);
      } else if (failed < outstanding.length) {
        toast.warning(
          `${outstanding.length - failed} marked, ${failed} failed`,
        );
      } else {
        toast.error("Could not mark rites complete");
      }
      router.refresh();
    });
  }

  return (
    <>
      {togglable.length > 1 && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasOutstanding || isMarking}
            onClick={markAll}
            className={cn("font-display tracking-widest")}
          >
            {!hasOutstanding ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                All marked
              </>
            ) : isMarking ? (
              "Marking…"
            ) : (
              <>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all complete ({outstanding.length})
              </>
            )}
          </Button>
        </div>
      )}
      {rites.map((r) => (
        <CheckinRow key={r.activityId} {...r} />
      ))}
    </>
  );
}
