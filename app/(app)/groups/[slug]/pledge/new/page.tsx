import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { groups, pledges } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isLocked } from "@/lib/dates";
import { PledgeForm } from "@/components/pledge-form";

interface NewPledgePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reward?: string; punishment?: string }>;
}

export default async function NewPledgePage({
  params,
  searchParams,
}: NewPledgePageProps) {
  const { slug } = await params;
  const { reward, punishment } = await searchParams;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  if (isLocked()) redirect(`/groups/${slug}`);

  const existing = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.userId, userId), eq(pledges.groupId, group.id)))
    .limit(1);

  if (existing.length > 0) redirect(`/groups/${slug}/pledge/edit`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          INSCRIBE THY PLEDGE
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {group.name}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Write thy vow and the daily rites. Both will be locked at midnight UTC
          on May 1st. Choose carefully.
        </p>
      </header>

      <PledgeForm
        slug={slug}
        defaultPledgeText=""
        defaultRewardText={reward ?? ""}
        defaultPunishmentText={punishment ?? ""}
        defaultActivities={[{ label: "", description: "" }]}
      />
    </div>
  );
}
