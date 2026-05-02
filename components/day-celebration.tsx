"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareActions } from "@/components/share-actions";
import { useSounds } from "@/hooks/use-sounds";

interface DayCelebrationContextValue {
  setCompletion: (activityId: string, completed: boolean) => void;
}

const DayCelebrationContext = createContext<DayCelebrationContextValue | null>(
  null,
);

export function useDayCelebration(): DayCelebrationContextValue | null {
  return useContext(DayCelebrationContext);
}

export interface CelebrationPantheon {
  slug: string;
  name: string;
}

interface ProviderProps {
  userId: string;
  userName: string;
  date: string;
  activityIds: string[];
  initialCompleted: Record<string, boolean>;
  pantheons?: CelebrationPantheon[];
  children: React.ReactNode;
}

export function DayCelebrationProvider({
  userId,
  userName,
  date,
  activityIds,
  initialCompleted,
  pantheons = [],
  children,
}: ProviderProps) {
  const [completionMap, setCompletionMap] =
    useState<Record<string, boolean>>(initialCompleted);
  const [open, setOpen] = useState(false);
  const playSound = useSounds();
  // If the day was already complete on first paint (e.g. the user reloaded
  // after finishing), skip the celebration until they break and re-make it.
  const wasCompleteRef = useRef(
    activityIds.length > 0 && activityIds.every((id) => initialCompleted[id]),
  );

  const setCompletion = useCallback(
    (activityId: string, completed: boolean) => {
      setCompletionMap((prev) => {
        if (prev[activityId] === completed) return prev;
        return { ...prev, [activityId]: completed };
      });
    },
    [],
  );

  const allDone = useMemo(() => {
    if (activityIds.length === 0) return false;
    return activityIds.every((id) => completionMap[id]);
  }, [activityIds, completionMap]);

  useEffect(() => {
    if (allDone && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      setOpen(true);
      playSound("pledgeInscribed");
    } else if (!allDone) {
      wasCompleteRef.current = false;
    }
  }, [allDone, playSound]);

  const value = useMemo(() => ({ setCompletion }), [setCompletion]);

  return (
    <DayCelebrationContext.Provider value={value}>
      {children}
      <DayCompleteDialog
        open={open}
        onOpenChange={setOpen}
        userId={userId}
        userName={userName}
        date={date}
        pantheons={pantheons}
      />
    </DayCelebrationContext.Provider>
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${MONTHS[Number(mm) - 1]} ${Number(dd)}, ${yyyy}`;
}

function DayCompleteDialog({
  open,
  onOpenChange,
  userId,
  userName,
  date,
  pantheons,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  userId: string;
  userName: string;
  date: string;
  pantheons: CelebrationPantheon[];
}) {
  const [origin] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.origin : "",
  );

  const shareUrl = origin ? `${origin}/share/daily/${userId}/${date}` : "";
  const imageUrl = shareUrl ? `${shareUrl}/opengraph-image` : "";
  const formattedDate = formatDate(date);
  const shareTitle = `Daily rite — ${formattedDate}`;
  const shareText = `${userName} kept every rite on ${formattedDate}.`;
  const downloadFilename = `lome-daily-${userName
    .toLowerCase()
    .replace(/\s+/g, "-")}-${date}.png`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
            The day is sealed
          </p>
          <DialogTitle className="font-display text-2xl tracking-tight md:text-3xl">
            Every rite kept — the parchment is ready
          </DialogTitle>
          <DialogDescription className="italic">
            Thy deeds bound to thy vow. Strike the parchment to the wider world,
            that the public square may witness how the day was met. Should
            thou wish to amend a rite, the day stays open until noon
            tomorrow.
          </DialogDescription>
        </DialogHeader>
        {imageUrl && (
          <div className="overflow-hidden rounded-md border border-gold/30 bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`Daily rite for ${userName} on ${formattedDate}`}
              width={1200}
              height={630}
              className="h-auto w-full"
            />
          </div>
        )}
        {imageUrl && (
          <ShareActions
            imageUrl={imageUrl}
            shareUrl={shareUrl}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadFilename={downloadFilename}
          />
        )}
        {pantheons.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              See how thy pantheon fares today
            </p>
            <div className="flex flex-col gap-2">
              {pantheons.map((p) => (
                <Button
                  key={p.slug}
                  asChild
                  variant="outline"
                  className="justify-between font-display tracking-widest"
                  onClick={() => onOpenChange(false)}
                >
                  <Link href={`/groups/${p.slug}`}>
                    <span>{p.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
