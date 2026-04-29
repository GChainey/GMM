import type {
  PledgeOptionIntensity,
  PledgeOptionType,
} from "@/db/schema";

export interface SeedPledgeOption {
  id: string;
  slug: string;
  label: string;
  description: string;
  type: PledgeOptionType;
  intensity: PledgeOptionIntensity;
  isSensitive: boolean;
}

export const SEED_PLEDGE_OPTIONS: SeedPledgeOption[] = [
  {
    id: "seed_reward_experience",
    slug: "experience",
    label: "Experience",
    description: "Treat thyself to a memorable outing or trip.",
    type: "reward",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_reward_purchase",
    slug: "purchase",
    label: "Purchase",
    description: "Buy that thing thou hast long coveted.",
    type: "reward",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_reward_gratitude",
    slug: "gratitude",
    label: "Gratitude",
    description: "Be honoured by friends and family.",
    type: "reward",
    intensity: "mild",
    isSensitive: false,
  },
  {
    id: "seed_reward_cash",
    slug: "cash",
    label: "Cash bounty",
    description: "A cash sum awaits the ascended.",
    type: "reward",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_reward_social",
    slug: "social",
    label: "Social glory",
    description: "Public celebration with thy circle.",
    type: "reward",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_punishment_charity",
    slug: "charity",
    label: "Charity donation",
    description: "Donate a sum to a chosen cause.",
    type: "punishment",
    intensity: "mild",
    isSensitive: false,
  },
  {
    id: "seed_punishment_chore",
    slug: "chore",
    label: "Chore penance",
    description: "A tedious chore for thy circle.",
    type: "punishment",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_punishment_cash_forfeit",
    slug: "cash_forfeit",
    label: "Cash forfeit",
    description: "Forfeit a sum (to charity, friends, or jar).",
    type: "punishment",
    intensity: "standard",
    isSensitive: false,
  },
  {
    id: "seed_punishment_embarrassment",
    slug: "embarrassment",
    label: "Embarrassment",
    description: "A humbling deed thou must perform.",
    type: "punishment",
    intensity: "hardcore",
    isSensitive: true,
  },
  {
    id: "seed_punishment_public_shame",
    slug: "public_shame",
    label: "Public shame",
    description: "Confess thy fall publicly.",
    type: "punishment",
    intensity: "hardcore",
    isSensitive: true,
  },
];

export const PRESET_KEYS = [
  "standard",
  "hardcore",
  "sensitive",
  "open",
] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

export interface Preset {
  key: PresetKey;
  label: string;
  description: string;
  rewardSlugs: string[];
  punishmentSlugs: string[];
  allowCustomReward: boolean;
  allowCustomPunishment: boolean;
}

export const PRESETS: Record<PresetKey, Preset> = {
  standard: {
    key: "standard",
    label: "Standard",
    description: "A balanced set. Members may also write their own.",
    rewardSlugs: ["experience", "purchase", "gratitude", "cash"],
    punishmentSlugs: ["charity", "chore", "cash_forfeit"],
    allowCustomReward: true,
    allowCustomPunishment: true,
  },
  hardcore: {
    key: "hardcore",
    label: "Hardcore",
    description: "Sharp consequences. No soft-out — choose from the list.",
    rewardSlugs: ["experience", "purchase", "cash", "social"],
    punishmentSlugs: [
      "charity",
      "cash_forfeit",
      "chore",
      "embarrassment",
      "public_shame",
    ],
    allowCustomReward: false,
    allowCustomPunishment: false,
  },
  sensitive: {
    key: "sensitive",
    label: "Sensitive",
    description: "Gentle kinds only. Custom text allowed.",
    rewardSlugs: ["experience", "gratitude", "purchase"],
    punishmentSlugs: ["charity", "chore"],
    allowCustomReward: true,
    allowCustomPunishment: true,
  },
  open: {
    key: "open",
    label: "Open",
    description: "Every kind enabled. Anything goes.",
    rewardSlugs: SEED_PLEDGE_OPTIONS.filter((o) => o.type === "reward").map(
      (o) => o.slug,
    ),
    punishmentSlugs: SEED_PLEDGE_OPTIONS.filter(
      (o) => o.type === "punishment",
    ).map((o) => o.slug),
    allowCustomReward: true,
    allowCustomPunishment: true,
  },
};

export const DEFAULT_PRESET: PresetKey = "standard";

export function seedSlugsToIds(slugs: string[]): string[] {
  const ids: string[] = [];
  for (const slug of slugs) {
    const opt = SEED_PLEDGE_OPTIONS.find((o) => o.slug === slug);
    if (opt) ids.push(opt.id);
  }
  return ids;
}
