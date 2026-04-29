"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Selection = "admin" | "individual";

interface CharityModeFieldsProps {
  defaultEnabled?: boolean;
  defaultSelection?: Selection;
  defaultName?: string;
  defaultUrl?: string;
}

export function CharityModeFields({
  defaultEnabled = false,
  defaultSelection = "individual",
  defaultName = "",
  defaultUrl = "",
}: CharityModeFieldsProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [selection, setSelection] = useState<Selection>(defaultSelection);

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
      <legend className="px-1 font-display text-sm tracking-widest">
        Charity mode
      </legend>
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="charityModeEnabled" className="text-base">
            Donate on the fall
          </Label>
          <p className="text-xs text-muted-foreground">
            When a mortal falls, their forfeit flows to the winner&apos;s chosen
            cause. The ascended decide where the silver lands.
          </p>
        </div>
        <Switch
          id="charityModeEnabled"
          name="charityModeEnabled"
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
      </div>

      {enabled && (
        <div className="flex flex-col gap-3 border-t border-border/40 pt-3">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Who picks the cause?
          </p>
          <div className="grid gap-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/40 p-3 has-checked:border-gold has-checked:bg-gold/5">
              <input
                type="radio"
                name="charitySelection"
                value="individual"
                className="mt-1"
                checked={selection === "individual"}
                onChange={() => setSelection("individual")}
              />
              <div>
                <p className="font-display text-base tracking-wide">
                  Each mortal picks their own
                </p>
                <p className="text-xs text-muted-foreground">
                  Every member names a cause when inscribing their pledge. A
                  fall feeds the winner&apos;s charity.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/40 p-3 has-checked:border-gold has-checked:bg-gold/5">
              <input
                type="radio"
                name="charitySelection"
                value="admin"
                className="mt-1"
                checked={selection === "admin"}
                onChange={() => setSelection("admin")}
              />
              <div>
                <p className="font-display text-base tracking-wide">
                  Founder picks one for all
                </p>
                <p className="text-xs text-muted-foreground">
                  Every fall in this pantheon flows to the same cause, named
                  below.
                </p>
              </div>
            </label>
          </div>

          {selection === "admin" && (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div className="grid gap-2">
                <Label htmlFor="charityName">Charity name</Label>
                <Input
                  id="charityName"
                  name="charityName"
                  defaultValue={defaultName}
                  maxLength={120}
                  placeholder="e.g. Médecins Sans Frontières"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="charityUrl">Link (optional)</Label>
                <Input
                  id="charityUrl"
                  name="charityUrl"
                  defaultValue={defaultUrl}
                  type="url"
                  maxLength={500}
                  placeholder="https://…"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
