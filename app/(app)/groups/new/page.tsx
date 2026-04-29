import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createGroupAction } from "../actions";

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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="rewardText">Default reward (optional)</Label>
                <Textarea
                  id="rewardText"
                  name="rewardText"
                  rows={3}
                  maxLength={500}
                  placeholder="What awaits the ascended?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="punishmentText">Default punishment (optional)</Label>
                <Textarea
                  id="punishmentText"
                  name="punishmentText"
                  rows={3}
                  maxLength={500}
                  placeholder="What befalls the fallen?"
                />
              </div>
            </div>
            <p className="text-xs italic text-muted-foreground">
              Members may override these on their own pledges.
            </p>
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
