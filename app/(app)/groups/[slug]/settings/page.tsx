import { eq, isNull, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { groups, pledgeOptions, type PledgeOption } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CopyableInput } from "@/components/copyable-input";
import { CharityModeFields } from "@/components/charity-mode-fields";
import type { CharitySelection } from "@/db/schema";
import {
  addCustomOptionAction,
  updateGroupSettingsAction,
} from "../../actions";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroupSettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();
  if (group.ownerId !== userId) redirect(`/groups/${slug}`);

  const allOptions = await db
    .select()
    .from(pledgeOptions)
    .where(or(isNull(pledgeOptions.groupId), eq(pledgeOptions.groupId, group.id)));

  const rewardOptions = allOptions.filter((o) => o.type === "reward");
  const punishmentOptions = allOptions.filter((o) => o.type === "punishment");

  const inviteUrl = `/groups/${slug}/join?token=${group.inviteToken}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          PANTHEON SETTINGS
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {group.name}
        </h1>
      </header>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Invite link</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <CopyableInput value={inviteUrl} />
          <p className="text-xs text-muted-foreground">
            Share this link to invite mortals into a sealed pantheon. Open
            pantheons can be joined directly from the public directory.
          </p>
        </CardContent>
      </Card>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Edit details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateGroupSettingsAction}
            className="flex flex-col gap-5"
          >
            <input type="hidden" name="slug" value={slug} />
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={group.name}
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={group.description}
                maxLength={500}
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
                defaultValue={group.strikeLimit}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="isPublic" className="text-base">
                  Open to all
                </Label>
                <p className="text-xs text-muted-foreground">
                  Open pantheons are visible to everyone.
                </p>
              </div>
              <Switch
                id="isPublic"
                name="isPublic"
                defaultChecked={group.isPublic}
              />
            </div>

            <OptionGrid
              title="Reward options"
              hint="Pick which rewards members may choose. ✦ = sensitive."
              fieldName="allowedRewardOptionIds"
              options={rewardOptions}
              selectedIds={group.allowedRewardOptionIds}
            />
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="allowCustomReward" className="text-base">
                  Allow custom reward
                </Label>
                <p className="text-xs text-muted-foreground">
                  Members may write their own reward instead of choosing a
                  preset kind.
                </p>
              </div>
              <Switch
                id="allowCustomReward"
                name="allowCustomReward"
                defaultChecked={group.allowCustomReward}
              />
            </div>

            <OptionGrid
              title="Punishment options"
              hint="Pick which punishments members may choose. ✦ = sensitive."
              fieldName="allowedPunishmentOptionIds"
              options={punishmentOptions}
              selectedIds={group.allowedPunishmentOptionIds}
            />
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="allowCustomPunishment" className="text-base">
                  Allow custom punishment
                </Label>
                <p className="text-xs text-muted-foreground">
                  Members may write their own punishment.
                </p>
              </div>
              <Switch
                id="allowCustomPunishment"
                name="allowCustomPunishment"
                defaultChecked={group.allowCustomPunishment}
              />
            </div>

            <CharityModeFields
              defaultEnabled={group.charityModeEnabled}
              defaultSelection={group.charitySelection as CharitySelection}
              defaultName={group.charityName}
              defaultUrl={group.charityUrl}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                className="gilded font-display tracking-widest"
              >
                Amend the rite
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Add a custom option
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Forge a kind unique to this pantheon. It will appear in the lists
            above and become selectable for members.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={addCustomOptionAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="slug" value={slug} />
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="custom-type">Type</Label>
                <select
                  id="custom-type"
                  name="type"
                  defaultValue="reward"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="reward">Reward</option>
                  <option value="punishment">Punishment</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="custom-intensity">Intensity</Label>
                <select
                  id="custom-intensity"
                  name="intensity"
                  defaultValue="standard"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="mild">Mild</option>
                  <option value="standard">Standard</option>
                  <option value="hardcore">Hardcore</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-label">Label</Label>
              <Input
                id="custom-label"
                name="label"
                required
                minLength={2}
                maxLength={60}
                placeholder="e.g. Cold plunge penance"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="custom-description">Description</Label>
              <Textarea
                id="custom-description"
                name="description"
                rows={2}
                maxLength={280}
                placeholder="Short description of this kind."
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <Label htmlFor="custom-sensitive" className="text-base">
                  Sensitive
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marks this kind with ✦ so members know it may be confronting.
                </p>
              </div>
              <Switch id="custom-sensitive" name="isSensitive" />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                className="font-display tracking-widest"
              >
                Forge option
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function OptionGrid({
  title,
  hint,
  fieldName,
  options,
  selectedIds,
}: {
  title: string;
  hint: string;
  fieldName: string;
  options: PledgeOption[];
  selectedIds: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
      <legend className="px-1 font-display text-sm tracking-widest">
        {title}
      </legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {options.length === 0 && (
          <p className="text-xs italic text-muted-foreground">
            No options forged yet.
          </p>
        )}
        {options.map((o) => {
          const checked = selectedIds.includes(o.id);
          return (
            <label
              key={o.id}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-border/40 p-2 has-checked:border-gold has-checked:bg-gold/5"
            >
              <input
                type="checkbox"
                name={fieldName}
                value={o.id}
                defaultChecked={checked}
                className="mt-1"
              />
              <span className="flex flex-col">
                <span className="font-display text-sm tracking-wide">
                  {o.label}
                  {o.intensity === "hardcore" && (
                    <span className="ml-1 text-xs uppercase tracking-widest text-fallen">
                      hardcore
                    </span>
                  )}
                  {o.isSensitive && <span className="ml-1">✦</span>}
                  {o.groupId && (
                    <span className="ml-1 text-xs italic text-muted-foreground">
                      (custom)
                    </span>
                  )}
                </span>
                {o.description && (
                  <span className="text-xs text-muted-foreground">
                    {o.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
