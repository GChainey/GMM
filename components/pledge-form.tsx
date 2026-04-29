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

interface ActivityDraft {
  id?: string;
  label: string;
  description: string;
}

interface PledgeFormProps {
  slug: string;
  defaultPledgeText: string;
  defaultRewardText: string;
  defaultPunishmentText: string;
  defaultActivities: ActivityDraft[];
}

export function PledgeForm({
  slug,
  defaultPledgeText,
  defaultRewardText,
  defaultPunishmentText,
  defaultActivities,
}: PledgeFormProps) {
  const initial: ActivityDraft[] =
    defaultActivities.length > 0
      ? defaultActivities
      : [{ label: "", description: "" }];
  const [acts, setActs] = useState<ActivityDraft[]>(initial);
  const [isPending, startTransition] = useTransition();

  function update(i: number, patch: Partial<ActivityDraft>) {
    setActs((curr) => curr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function add() {
    setActs((curr) => [...curr, { label: "", description: "" }]);
  }

  function remove(i: number) {
    setActs((curr) => (curr.length === 1 ? curr : curr.filter((_, idx) => idx !== i)));
  }

  function onSubmit(formData: FormData) {
    const cleaned = acts
      .map((a) => ({
        id: a.id,
        label: a.label.trim(),
        description: a.description.trim(),
      }))
      .filter((a) => a.label.length > 0);
    if (cleaned.length === 0) {
      toast.error("Add at least one daily rite.");
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
          <CardTitle className="font-display text-2xl">Daily Rites</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each rite must be performed every day of May. Add as many as thou
            darest.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {acts.map((a, i) => (
            <div
              key={a.id ?? `new-${i}`}
              className="flex items-start gap-2 rounded-md border border-border/60 p-3"
            >
              <span className="mt-2 font-display text-sm tracking-widest text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  value={a.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="e.g. Morning gym session"
                  required
                  maxLength={120}
                />
                <Input
                  value={a.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Optional detail or boundary"
                  maxLength={500}
                />
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
