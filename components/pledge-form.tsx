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
  outcomeText: string;
}

export interface PledgeOptionLite {
  id: string;
  label: string;
  description: string;
  intensity: "mild" | "standard" | "hardcore";
  isSensitive: boolean;
}

interface PledgeFormProps {
  slug: string;
  defaultPledgeText: string;
  defaultRewardOptionId: string | null;
  defaultPunishmentOptionId: string | null;
  defaultRewardText: string;
  defaultPunishmentText: string;
  defaultActivities: ActivityDraft[];
  rewardOptions: PledgeOptionLite[];
  punishmentOptions: PledgeOptionLite[];
  allowCustomReward: boolean;
  allowCustomPunishment: boolean;
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

const CUSTOM_VALUE = "__custom__";

export function PledgeForm({
  slug,
  defaultPledgeText,
  defaultRewardOptionId,
  defaultPunishmentOptionId,
  defaultRewardText,
  defaultPunishmentText,
  defaultActivities,
  rewardOptions,
  punishmentOptions,
  allowCustomReward,
  allowCustomPunishment,
}: PledgeFormProps) {
  const initial: ActivityDraft[] =
    defaultActivities.length > 0
      ? defaultActivities
      : [
          {
            label: "",
            description: "",
            kind: "do",
            targetAmount: "",
            unit: "",
            outcomeText: "",
          },
        ];
  const [acts, setActs] = useState<ActivityDraft[]>(initial);
  const [isPending, startTransition] = useTransition();

  const initialRewardChoice =
    defaultRewardOptionId &&
    rewardOptions.some((o) => o.id === defaultRewardOptionId)
      ? defaultRewardOptionId
      : allowCustomReward && defaultRewardText
        ? CUSTOM_VALUE
        : rewardOptions[0]?.id ?? (allowCustomReward ? CUSTOM_VALUE : "");
  const initialPunishmentChoice =
    defaultPunishmentOptionId &&
    punishmentOptions.some((o) => o.id === defaultPunishmentOptionId)
      ? defaultPunishmentOptionId
      : allowCustomPunishment && defaultPunishmentText
        ? CUSTOM_VALUE
        : punishmentOptions[0]?.id ??
          (allowCustomPunishment ? CUSTOM_VALUE : "");

  const [rewardChoice, setRewardChoice] = useState<string>(initialRewardChoice);
  const [punishmentChoice, setPunishmentChoice] = useState<string>(
    initialPunishmentChoice,
  );

  function update(i: number, patch: Partial<ActivityDraft>) {
    setActs((curr) => curr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function add() {
    setActs((curr) => [
      ...curr,
      {
        label: "",
        description: "",
        kind: "do",
        targetAmount: "",
        unit: "",
        outcomeText: "",
      },
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
      outcomeText: string;
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
        outcomeText: a.outcomeText.trim(),
      });
    }
    if (cleaned.length === 0) {
      toast.error("Add at least one rite or tally.");
      return;
    }

    if (!rewardChoice) {
      toast.error("Pick a reward.");
      return;
    }
    if (!punishmentChoice) {
      toast.error("Pick a punishment.");
      return;
    }

    formData.set(
      "rewardOptionId",
      rewardChoice === CUSTOM_VALUE ? "" : rewardChoice,
    );
    formData.set(
      "punishmentOptionId",
      punishmentChoice === CUSTOM_VALUE ? "" : punishmentChoice,
    );
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

  const rewardSelected = rewardOptions.find((o) => o.id === rewardChoice);
  const punishmentSelected = punishmentOptions.find(
    (o) => o.id === punishmentChoice,
  );

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
            <OptionPicker
              kind="reward"
              label="Reward"
              placeholder="What awaits thee upon ascension?"
              options={rewardOptions}
              allowCustom={allowCustomReward}
              value={rewardChoice}
              onChange={setRewardChoice}
              detailName="rewardText"
              defaultDetail={defaultRewardText}
              selected={rewardSelected}
            />
            <OptionPicker
              kind="punishment"
              label="Punishment"
              placeholder="What shall befall thee should thou fall?"
              options={punishmentOptions}
              allowCustom={allowCustomPunishment}
              value={punishmentChoice}
              onChange={setPunishmentChoice}
              detailName="punishmentText"
              defaultDetail={defaultPunishmentText}
              selected={punishmentSelected}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Rites & Tallies</CardTitle>
          <p className="text-sm text-muted-foreground">
            Three kinds of vow. Each rite leads to an outcome — name what thou
            shalt ship on May 31.
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
                <div className="grid gap-1 rounded-md border border-gold/40 bg-gold/5 p-2">
                  <Label className="font-display text-[0.7rem] tracking-widest text-muted-foreground">
                    Month&apos;s end — what this rite ships
                  </Label>
                  <Textarea
                    rows={2}
                    value={a.outcomeText}
                    onChange={(e) =>
                      update(i, { outcomeText: e.target.value })
                    }
                    placeholder={
                      a.kind === "abstain"
                        ? "e.g. 30-day clear-headed journal published"
                        : a.kind === "monthly_total"
                          ? "e.g. A logged 75-km route map"
                          : "e.g. A Zoom recital with three original songs"
                    }
                    maxLength={1000}
                  />
                </div>
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

function OptionPicker({
  kind,
  label,
  placeholder,
  options,
  allowCustom,
  value,
  onChange,
  detailName,
  defaultDetail,
  selected,
}: {
  kind: "reward" | "punishment";
  label: string;
  placeholder: string;
  options: PledgeOptionLite[];
  allowCustom: boolean;
  value: string;
  onChange: (v: string) => void;
  detailName: string;
  defaultDetail: string;
  selected?: PledgeOptionLite;
}) {
  const isCustom = value === CUSTOM_VALUE;
  const noOptions = options.length === 0 && !allowCustom;

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {noOptions ? (
        <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
          The founder hath set no {kind} options. Ask them to amend the rite.
        </p>
      ) : (
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={`${label} kind`}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
                {o.intensity === "hardcore" ? " (hardcore)" : ""}
                {o.isSensitive ? " ✦" : ""}
              </option>
            ))}
            {allowCustom && (
              <option value={CUSTOM_VALUE}>Custom — write thine own…</option>
            )}
          </select>
          {selected && !isCustom && selected.description && (
            <p className="text-xs italic text-muted-foreground">
              {selected.description}
            </p>
          )}
          <Textarea
            id={detailName}
            name={detailName}
            rows={3}
            defaultValue={defaultDetail}
            placeholder={
              isCustom
                ? placeholder
                : "Specifics — the charity, the sum, the deed…"
            }
            maxLength={1000}
          />
        </>
      )}
    </div>
  );
}
