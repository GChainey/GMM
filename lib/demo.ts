// Demo-mode constants and seed manifests. The cookie reader and
// today-resolver live in lib/dates.ts so all callers see one chokepoint.

export function isDemoMode(): boolean {
  // Always on in dev so `npm run dev` is a one-step demo. Prod stays opt-in
  // via NEXT_PUBLIC_DEMO_MODE=1. Set NEXT_PUBLIC_DEMO_MODE=0 in dev to disable.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "0") return false;
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export const DEMO_GROUP_SLUG = "demo-council";
export const DEMO_GROUP_NAME = "The Demo Council";
export const DEMO_USER_PREFIX = "demo_";

// When real today is outside May 2026 (i.e. always, today), fall back to this
// so the demo lands midway through the challenge with no clock-setting needed.
export const DEMO_DEFAULT_TODAY = "2026-05-15";

export interface DemoMemberSeed {
  id: string;
  displayName: string;
  faceStyle: number;
  faceColor: number;
  faceGaze: number;
  faceDepth: number;
  pledgeText: string;
  rewardText: string;
  punishmentText: string;
  outcomeText: string;
  activities: DemoActivitySeed[];
  // Realistic completion behavior used to back-fill checkins.
  // Each rule is applied per (activity, day) pair.
  // 1.0 = always complete, 0.85 = misses ~15%, etc.
  completionRate: number;
}

export interface DemoActivitySeed {
  label: string;
  description: string;
  kind: "do" | "abstain" | "monthly_total";
  targetAmount: number | null;
  unit: string | null;
  // For monthly_total: per-day amount when "completed". For do/abstain: ignored.
  dailyAmount?: number;
}

export const DEMO_MEMBERS: DemoMemberSeed[] = [
  {
    id: `${DEMO_USER_PREFIX}apollo`,
    displayName: "Apollo of the Lyre",
    faceStyle: 1,
    faceColor: 4,
    faceGaze: 2,
    faceDepth: 3,
    pledgeText:
      "I shall awaken before the sun and write a song each day, that May may end with a recital.",
    rewardText: "A new lyre, gilded.",
    punishmentText: "Public busking on the high street, hat in hand.",
    outcomeText: "A 30-minute recital streamed to the pantheon on May 31.",
    completionRate: 0.95,
    activities: [
      {
        label: "Write or refine one song",
        description: "Even a fragment counts.",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "Practice an hour",
        description: "",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "No streaming services",
        description: "Silence the algorithm; listen with intent.",
        kind: "abstain",
        targetAmount: null,
        unit: null,
      },
    ],
  },
  {
    id: `${DEMO_USER_PREFIX}athena`,
    displayName: "Athena Strategikos",
    faceStyle: 2,
    faceColor: 1,
    faceGaze: 1,
    faceDepth: 2,
    pledgeText:
      "I shall plot a course through 750 pages of the canon, and emerge with a treatise.",
    rewardText: "A weekend at the spa, untouched by laptop or phone.",
    punishmentText: "£200 to my political opposite's chosen charity.",
    outcomeText: "A 3,000-word treatise circulated on May 31.",
    completionRate: 1.0,
    activities: [
      {
        label: "Read 25 pages",
        description: "",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "Pages read",
        description: "Cumulative tally toward 750.",
        kind: "monthly_total",
        targetAmount: 750,
        unit: "pages",
        dailyAmount: 26,
      },
    ],
  },
  {
    id: `${DEMO_USER_PREFIX}hermes`,
    displayName: "Hermes Swiftfoot",
    faceStyle: 3,
    faceColor: 2,
    faceGaze: 3,
    faceDepth: 1,
    pledgeText:
      "I shall run 100km and abstain from the takeaway courier, that I may finish a 10k.",
    rewardText: "New running shoes — the proper ones.",
    punishmentText: "Two weekends of road-cleaning service.",
    outcomeText: "A timed 10k race entered and run on May 30.",
    completionRate: 0.78,
    activities: [
      {
        label: "Run or train",
        description: "",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "No takeaway",
        description: "Cooked at home or eaten in.",
        kind: "abstain",
        targetAmount: null,
        unit: null,
      },
      {
        label: "Distance run",
        description: "",
        kind: "monthly_total",
        targetAmount: 100,
        unit: "km",
        dailyAmount: 4,
      },
    ],
  },
  {
    id: `${DEMO_USER_PREFIX}artemis`,
    displayName: "Artemis of the Hunt",
    faceStyle: 0,
    faceColor: 3,
    faceGaze: 0,
    faceDepth: 0,
    pledgeText:
      "I shall sketch the wild things — one creature each day — and mount a small show.",
    rewardText: "A weekend cabin in the woods, alone with sketchbook.",
    punishmentText: "Posting every bad sketch to a public account.",
    outcomeText: "A 31-piece exhibition hung in the local cafe on May 31.",
    completionRate: 0.9,
    activities: [
      {
        label: "Sketch one creature",
        description: "Mammals, birds, fish — even imagined.",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "No social media",
        description: "Cold turkey.",
        kind: "abstain",
        targetAmount: null,
        unit: null,
      },
    ],
  },
  {
    id: `${DEMO_USER_PREFIX}dionysus`,
    displayName: "Dionysus the Reformed",
    faceStyle: 1,
    faceColor: 5,
    faceGaze: 3,
    faceDepth: 2,
    pledgeText:
      "I shall abstain from drink for thirty-one nights, that the festival hereafter may ring true.",
    rewardText: "A bottle of something rare, June 1st.",
    punishmentText: "Confession to my brother and a written essay on why.",
    outcomeText: "A clear-headed essay on the experience, due May 31.",
    completionRate: 0.55,
    activities: [
      {
        label: "No alcohol",
        description: "",
        kind: "abstain",
        targetAmount: null,
        unit: null,
      },
      {
        label: "Journal honestly",
        description: "Three sentences minimum.",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
    ],
  },
  {
    id: `${DEMO_USER_PREFIX}hephaestus`,
    displayName: "Hephaestus the Maker",
    faceStyle: 2,
    faceColor: 0,
    faceGaze: 2,
    faceDepth: 3,
    pledgeText:
      "I shall ship one feature each day to my side project, and demo it to the pantheon at month's end.",
    rewardText: "A new keyboard, custom-built.",
    punishmentText: "Open-sourcing the project, ready or not.",
    outcomeText: "A live demo of the project to the pantheon on May 31.",
    completionRate: 0.88,
    activities: [
      {
        label: "Ship a commit",
        description: "Real, mergeable, deployed.",
        kind: "do",
        targetAmount: null,
        unit: null,
      },
      {
        label: "Lines of code shipped",
        description: "Net additions; deletions don't count.",
        kind: "monthly_total",
        targetAmount: 2000,
        unit: "lines",
        dailyAmount: 70,
      },
    ],
  },
];
