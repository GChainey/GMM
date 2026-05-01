import { and, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { groups, pledgeOptions, pledges } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { PledgeForm, type PledgeOptionLite } from "@/components/pledge-form";
import type { CharitySelection } from "@/db/schema";

interface NewPledgePageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewPledgePage({ params }: NewPledgePageProps) {
  const { slug } = await params;
  const userId = await requireUserId();

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!group) notFound();

  const existing = await db
    .select()
    .from(pledges)
    .where(and(eq(pledges.userId, userId), eq(pledges.groupId, group.id)))
    .limit(1);

  if (existing.length > 0) redirect(`/groups/${slug}/pledge/edit`);

  const allowedIds = [
    ...group.allowedRewardOptionIds,
    ...group.allowedPunishmentOptionIds,
  ];
  const options = allowedIds.length
    ? await db
        .select()
        .from(pledgeOptions)
        .where(inArray(pledgeOptions.id, allowedIds))
    : [];

  const toLite = (id: string): PledgeOptionLite | null => {
    const o = options.find((x) => x.id === id);
    if (!o) return null;
    return {
      id: o.id,
      label: o.label,
      description: o.description,
      intensity: o.intensity as PledgeOptionLite["intensity"],
      isSensitive: o.isSensitive,
    };
  };
  const rewardOptions = group.allowedRewardOptionIds
    .map(toLite)
    .filter((o): o is PledgeOptionLite => o !== null);
  const punishmentOptions = group.allowedPunishmentOptionIds
    .map(toLite)
    .filter((o): o is PledgeOptionLite => o !== null);

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
          Write thy vow and the daily rites. Both may be amended later — every
          revision is recorded in the ledger.
        </p>
      </header>

      <PledgeForm
        slug={slug}
        defaultPledgeText=""
        defaultRewardOptionId={null}
        defaultPunishmentOptionId={null}
        defaultRewardText=""
        defaultPunishmentText=""
        defaultActivities={[
          {
            label: "",
            description: "",
            kind: "do",
            targetAmount: "",
            unit: "",
            outcomeText: "",
          },
        ]}
        rewardOptions={rewardOptions}
        punishmentOptions={punishmentOptions}
        allowCustomReward={group.allowCustomReward}
        allowCustomPunishment={group.allowCustomPunishment}
        charity={{
          enabled: group.charityModeEnabled,
          selection: group.charitySelection as CharitySelection,
          groupCharityName: group.charityName,
          groupCharityUrl: group.charityUrl,
          defaultName: "",
          defaultUrl: "",
        }}
      />
    </div>
  );
}
