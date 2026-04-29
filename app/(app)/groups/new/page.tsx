import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createGroupAction } from "../actions";
import { DEFAULT_PRESET, PRESETS, PRESET_KEYS } from "@/lib/pledge-options";

export default function NewGroupPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          FOUND A PANTHEON
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Lay the cornerstone
        </h1>
        <p className="mt-2 text-muted-foreground">
          Name thy circle of mortals. Set the rules of the rite. Strikes,
          openness, and consequences.
        </p>
      </header>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Pantheon details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGroupAction} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="The Faithful Few"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                maxLength={500}
                placeholder="A short word about thy circle…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="strikeLimit">Strikes allowed</Label>
              <Input
                id="strikeLimit"
                name="strikeLimit"
                type="number"
                min={0}
                max={31}
                defaultValue={0}
              />
              <p className="text-xs text-muted-foreground">
                0 = instant fall on the first miss. Higher numbers grant mercy.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="isPublic" className="text-base">
                  Open to all
                </Label>
                <p className="text-xs text-muted-foreground">
                  Open pantheons appear in the public directory. Sealed
                  pantheons require an invite link.
                </p>
              </div>
              <Switch id="isPublic" name="isPublic" defaultChecked />
            </div>

            <fieldset className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
              <legend className="px-1 font-display text-sm tracking-widest">
                Reward & punishment preset
              </legend>
              <p className="text-xs text-muted-foreground">
                Choose the rite. Members will pick from the list (and write
                their own where allowed). Thou canst fine-tune the options
                after founding.
              </p>
              <div className="grid gap-2">
                {PRESET_KEYS.map((key) => {
                  const p = PRESETS[key];
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border/40 p-3 has-checked:border-gold has-checked:bg-gold/5"
                    >
                      <input
                        type="radio"
                        name="preset"
                        value={key}
                        defaultChecked={key === DEFAULT_PRESET}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-display text-base tracking-wide">
                          {p.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button type="submit" className="gilded font-display tracking-widest">
                Found Pantheon
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
