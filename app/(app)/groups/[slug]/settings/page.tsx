import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CopyableInput } from "@/components/copyable-input";
import { updateGroupSettingsAction } from "../../actions";

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

  const inviteUrl = `/groups/${slug}/join?token=${group.inviteToken}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 md:px-10">
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
    </div>
  );
}
