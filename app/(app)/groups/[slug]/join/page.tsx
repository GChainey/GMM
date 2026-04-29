import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinGroupAction } from "../../actions";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function JoinGroupPage({
  params,
  searchParams,
}: JoinPageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  const showTokenField = !group.isPublic && token !== group.inviteToken;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          JOIN A PANTHEON
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {group.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {group.description || "—"}
        </p>
      </header>

      <Card className="marble-card">
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {group.isPublic ? "Take the vow" : "Speak the password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={joinGroupAction} className="flex flex-col gap-5">
            <input type="hidden" name="slug" value={slug} />
            {showTokenField ? (
              <div className="grid gap-2">
                <Label htmlFor="token">Invite token</Label>
                <Input
                  id="token"
                  name="token"
                  required
                  defaultValue={token ?? ""}
                  placeholder="abc123…"
                />
                <p className="text-xs text-muted-foreground">
                  This pantheon is sealed. Ask a member for the invite link.
                </p>
              </div>
            ) : (
              <input type="hidden" name="token" value={token ?? ""} />
            )}
            <p className="rounded-md border border-gold/40 bg-gold/10 p-3 text-sm">
              Strike limit: {group.strikeLimit === 0
                ? "0 — a single miss is fatal"
                : `${group.strikeLimit} miss${group.strikeLimit === 1 ? "" : "es"} allowed`}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="submit" className="gilded font-display tracking-widest">
                Take the vow
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
