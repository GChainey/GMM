import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { activities, groups, pledges } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { isLocked } from "@/lib/dates";
import { PledgeForm } from "@/components/pledge-form";

interface EditPledgePageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPledgePage({ params }: EditPledgePageProps) {
  const { slug } = await params;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  if (isLocked()) redirect(`/groups/${slug}`);

  const [pledge] = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.userId, userId), eq(pledges.groupId, group.id)))
    .limit(1);
  if (!pledge) redirect(`/groups/${slug}/pledge/new`);

  const acts = await db
    .select()
    .from(activities)
    .where(eq(activities.pledgeId, pledge.id))
    .orderBy(asc(activities.sortOrder));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          AMEND THY PLEDGE
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          {group.name}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Pledges may be amended until midnight UTC on May 1st.
        </p>
      </header>

      <PledgeForm
        slug={slug}
        defaultPledgeText={pledge.pledgeText}
        defaultRewardText={pledge.rewardText}
        defaultPunishmentText={pledge.punishmentText}
        defaultOutcomeText={pledge.outcomeText}
        defaultActivities={acts.map((a) => ({
          id: a.id,
          label: a.label,
          description: a.description,
          kind: (a.kind as "do" | "abstain" | "monthly_total") ?? "do",
          targetAmount:
            a.targetAmount != null ? String(a.targetAmount) : "",
          unit: a.unit ?? "",
        }))}
      />
    </div>
  );
}
