"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { savePledgeAction } from "@/app/(app)/groups/[slug]/pledge/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ActivityKind = "do" | "abstain" | "monthly_total";

interface ActivityDraft {
  id?: string;
  label: string;
  description: string;
  kind: ActivityKind;
  targetAmount: string;
  unit: string;
}

interface PledgeFormProps {
  slug: string;
  defaultPledgeText: string;
  defaultRewardText: string;
  defaultPunishmentText: string;
  defaultOutcomeText: string;
  defaultActivities: ActivityDraft[];
}

const KIND_LABEL: Record<ActivityKind, string> = {
  do: "Do daily",
  abstain: "Abstain daily",
  monthly_total: "Monthly tally",
};

const KIND_TONE: Record<ActivityKind, string> = {
  do: "border-divine/40 bg-divine/5",
  abstain: "border-fallen/40 bg-fallen/5",
  monthly_total: "border-gold/50 bg-gold/5",
};

export function PledgeForm({
  slug,
  defaultPledgeText,
  defaultRewardText,
  defaultPunishmentText,
  defaultOutcomeText,
  defaultActivities,
}: PledgeFormProps) {
  const initial: ActivityDraft[] =
    defaultActivities.length > 0
      ? defaultActivities
      : [{ label: "", description: "", kind: "do", targetAmount: "", unit: "" }];
  const [acts, setActs] = useState<ActivityDraft[]>(initial);
  const [isPending, startTransition] = useTransition();

  function update(i: number, patch: Partial<ActivityDraft>) {
    setActs((curr) => curr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function add() {
    setActs((curr) => [
      ...curr,
      { label: "", description: "", kind: "do", targetAmount: "", unit: "" },
    ]);
  }

  function remove(i: number) {
    setActs((curr) => (curr.length === 1 ? curr : curr.filter((_, idx) => idx !== i)));
  }

  function onSubmit(formData: FormData) {
    const cleaned: Array<{
      id?: string;
      label: string;
      description: string;
      kind: ActivityKind;
      targetAmount: number | null;
      unit: string | null;
    }> = [];
    for (const a of acts) {
      const label = a.label.trim();
      if (!label) continue;
      const kind: ActivityKind = a.kind;
      let targetAmount: number | null = null;
      let unit: string | null = null;
      if (kind === "monthly_total") {
        const parsed = Number(a.targetAmount);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast.error(`"${label}" needs a positive monthly target.`);
          return;
        }
        targetAmount = Math.round(parsed);
        unit = a.unit.trim() || null;
      }
      cleaned.push({
        id: a.id,
        label,
        description: a.description.trim(),
        kind,
        targetAmount,
        unit,
      });
    }
    if (cleaned.length === 0) {
      toast.error("Add at least one rite or tally.");
      return;
    }
    formData.set("activitiesJson", JSON.stringify(cleaned));
    startTransition(async () => {
      try {
        await savePledgeAction(formData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not inscribe thy pledge.";
        toast.error(message);
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="slug" value={slug} />

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">The Vow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pledgeText">I solemnly pledge…</Label>
            <Textarea
              id="pledgeText"
              name="pledgeText"
              rows={6}
              defaultValue={defaultPledgeText}
              placeholder="Write thy vow in plain words. e.g. 'I solemnly pledge to wake before dawn, run thrice weekly, abstain from sweets, and read each evening for the whole of May.'"
              maxLength={4000}
            />
          </div>
          <div className="grid gap-2 rounded-md border border-gold/40 bg-gold/5 p-3">
            <Label htmlFor="outcomeText" className="font-display tracking-widest">
              Month&apos;s end — what thou shalt ship
            </Label>
            <p className="text-xs text-muted-foreground">
              The daily rites lead somewhere. Name the deliverable thou wilt show
              the pantheon on May 31 — a recital, a release, an exhibition, a
              demo. Be specific.
            </p>
            <Textarea
              id="outcomeText"
              name="outcomeText"
              rows={3}
              defaultValue={defaultOutcomeText}
              placeholder="e.g. Hold a Zoom recital with three original songs. Or: open-studio show of 30 drawings. Or: publish a 2,000-word essay."
              maxLength={1000}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="rewardText">Reward</Label>
              <Textarea
                id="rewardText"
                name="rewardText"
                rows={3}
                defaultValue={defaultRewardText}
                placeholder="What awaits thee upon ascension?"
                maxLength={1000}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="punishmentText">Punishment</Label>
              <Textarea
                id="punishmentText"
                name="punishmentText"
                rows={3}
                defaultValue={defaultPunishmentText}
                placeholder="What shall befall thee should thou fall?"
                maxLength={1000}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Rites & Tallies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Three kinds of vow. Pick one for each row.
          </p>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
            <li>
              <span className="font-display tracking-widest text-foreground">
                Do daily
              </span>{" "}
              — perform every day of May.
            </li>
            <li>
              <span className="font-display tracking-widest text-foreground">
                Abstain daily
              </span>{" "}
              — refrain every day of May.
            </li>
            <li>
              <span className="font-display tracking-widest text-foreground">
                Monthly tally
              </span>{" "}
              — accumulate to a target by month&apos;s end (e.g. 75 km).
            </li>
          </ul>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {acts.map((a, i) => (
            <div
              key={a.id ?? `new-${i}`}
              className={cn(
                "flex items-start gap-2 rounded-md border p-3 transition",
                KIND_TONE[a.kind],
              )}
            >
              <span className="mt-2 font-display text-sm tracking-widest text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <select
                    aria-label="Kind"
                    value={a.kind}
                    onChange={(e) =>
                      update(i, { kind: e.target.value as ActivityKind })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm font-display tracking-widest"
                  >
                    {(Object.keys(KIND_LABEL) as ActivityKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={a.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    placeholder={
                      a.kind === "abstain"
                        ? "e.g. No alcohol"
                        : a.kind === "monthly_total"
                          ? "e.g. Total kilometres run"
                          : "e.g. Morning gym session"
                    }
                    required
                    maxLength={120}
                    className="flex-1"
                  />
                </div>
                <Input
                  value={a.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Optional detail or boundary"
                  maxLength={500}
                />
                {a.kind === "monthly_total" && (
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={a.targetAmount}
                      onChange={(e) =>
                        update(i, { targetAmount: e.target.value })
                      }
                      placeholder="Target (e.g. 75)"
                      required
                    />
                    <Input
                      value={a.unit}
                      onChange={(e) => update(i, { unit: e.target.value })}
                      placeholder="Unit (e.g. km, pages, reps)"
                      maxLength={24}
                    />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Remove rite"
                disabled={acts.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={add}
            className="self-start font-display tracking-widest"
          >
            <Plus className="mr-2 h-4 w-4" /> Add a rite
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isPending}
          className="gilded font-display tracking-widest"
        >
          {isPending ? "Inscribing…" : "Inscribe pledge"}
        </Button>
      </div>
    </form>
  );
}
