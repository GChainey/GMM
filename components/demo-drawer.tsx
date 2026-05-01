"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, Wand2Icon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  clearDemoTodayAction,
  getDemoStateAction,
  markMemberCompletedAction,
  markMemberMissedAction,
  resetDemoPantheonAction,
  runDemoTodayAction,
  seedDemoPantheonAction,
  setDemoTodayAction,
  shiftDemoTodayAction,
  type DemoState,
} from "@/app/_demo/actions";

const DEMO_HOTKEY = "k";

export function DemoDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DemoState | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const next = await getDemoStateAction();
    setState(next);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        void refresh();
      }
    },
    [refresh],
  );

  // Cmd+Shift+K opens the demo drawer. Plain Cmd+K is owned by the command
  // palette, so we require shift here to avoid fighting it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== DEMO_HOTKEY) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (!e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }
      e.preventDefault();
      handleOpenChange(!open);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleOpenChange, open]);

  const run = useCallback(
    (fn: () => Promise<unknown>) => {
      startTransition(async () => {
        await fn();
        await refresh();
        router.refresh();
      });
    },
    [refresh, router],
  );

  const today = state?.demoToday ?? state?.realToday ?? "—";
  const challengeStart = state?.challengeStart ?? "2026-05-01";
  const challengeEnd = state?.challengeEnd ?? "2026-05-31";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 font-display tracking-widest">
            <Wand2Icon className="size-4" />
            Demo Controls
          </SheetTitle>
          <SheetDescription>
            Time-travel through May, mark misses, reseed the demo pantheon. Real
            data is unaffected outside the Demo Council.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <section>
            <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              The clock
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => shiftDemoTodayAction({ delta: -1 }))}
              >
                <ChevronLeftIcon className="size-4" />
                Prev day
              </Button>
              <div className="flex-1 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-center font-mono text-sm">
                {today}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => shiftDemoTodayAction({ delta: 1 }))}
              >
                Next day
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                min={challengeStart}
                max={challengeEnd}
                value={state?.demoToday ?? state?.realToday ?? ""}
                disabled={pending}
                className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-sm"
                onChange={(e) => {
                  if (!e.currentTarget.value) return;
                  run(() =>
                    setDemoTodayAction({ date: e.currentTarget.value }),
                  );
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => clearDemoTodayAction())}
              >
                Clear override
              </Button>
            </div>
            {state?.demoToday ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Override active. Real today is{" "}
                <span className="font-mono">{state.realToday}</span>.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No override set — running on real time.
              </p>
            )}
          </section>

          <section>
            <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              The pantheon
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={pending}
                className="gilded font-display tracking-widest"
                onClick={() => run(() => seedDemoPantheonAction())}
              >
                {state?.pantheonExists ? "Reseed Demo Council" : "Seed Demo Council"}
              </Button>
              {state?.pantheonExists && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => runDemoTodayAction())}
                  >
                    Roll today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => resetDemoPantheonAction())}
                  >
                    Wipe
                  </Button>
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Seed founds <span className="font-mono">/groups/{state?.pantheonSlug ?? "demo-council"}</span>{" "}
              with thee as founder and six fake mortals back-filled to the demo
              clock. &quot;Roll today&quot; uses each member&rsquo;s habit rate to
              decide who shows up.
            </p>
          </section>

          {state?.pantheonExists && state.members.length > 0 && (
            <section>
              <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
                Mortals on {today}
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {state.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 p-2"
                  >
                    <UserAvatar
                      name={m.displayName}
                      size={32}
                      customization={{
                        faceStyle: m.faceStyle,
                        faceColor: m.faceColor,
                        faceGaze: m.faceGaze,
                        faceDepth: m.faceDepth,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-display text-sm tracking-tight">
                        {m.displayName}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-0.5 font-mono text-[0.6rem]"
                      >
                        {m.todayDone}/{m.todayTotal} done
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            markMemberCompletedAction({ userId: m.id }),
                          )
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          run(() => markMemberMissedAction({ userId: m.id }))
                        }
                      >
                        Miss
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            ⌘⇧K toggles this drawer. ⌘K opens the command palette.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
