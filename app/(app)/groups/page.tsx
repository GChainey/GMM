import Link from "next/link";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function GroupsBrowsePage() {
  const userId = await requireUserId();

  const publicGroups = await db
    .select()
    .from(groups)
    .where(and(eq(groups.isPublic, true), isNull(groups.archivedAt)))
    .orderBy(desc(groups.createdAt))
    .limit(50);

  const myMemberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, userId));
  const joinedSet = new Set(myMemberships.map((m) => m.groupId));

  const archivedOwned = await db
    .select()
    .from(groups)
    .where(and(eq(groups.ownerId, userId), isNotNull(groups.archivedAt)))
    .orderBy(desc(groups.archivedAt));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
            THE PANTHEONS
          </p>
          <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            Open gatherings
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Walk among the open pantheons. Find a circle of mortals striving for
            ascension, or found one of thy own.
          </p>
        </div>
        <Button asChild className="gilded font-display tracking-widest">
          <Link href="/groups/new">Found a Pantheon</Link>
        </Button>
      </header>

      {publicGroups.length === 0 ? (
        <Card className="marble-card">
          <CardContent className="p-8">
            <p className="font-display italic text-muted-foreground">
              No open pantheons exist yet. Be the first to lay the cornerstone.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {publicGroups.map((g) => {
            const joined = joinedSet.has(g.id);
            return (
              <Card key={g.id} className="marble-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="font-display text-2xl tracking-tight">
                      <Link href={`/groups/${g.slug}`} className="hover:underline">
                        {g.name}
                      </Link>
                    </CardTitle>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline" className="font-display">
                        {g.strikeLimit === 0
                          ? "No strikes"
                          : `${g.strikeLimit} strikes`}
                      </Badge>
                      {joined && (
                        <Badge className="bg-divine text-primary-foreground font-display">
                          Joined
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {g.description || "—"}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    {joined ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/groups/${g.slug}`}>Enter</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" className="gilded font-display">
                        <Link href={`/groups/${g.slug}/join`}>Join</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {archivedOwned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl tracking-tight text-muted-foreground">
            Thy archived pantheons
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {archivedOwned.map((g) => (
              <Card key={g.id} className="marble-card border-dashed opacity-80">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <span className="font-display text-lg tracking-tight">
                      {g.name}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-fallen">
                      Archived
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/groups/${g.slug}/settings`}>Manage</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
