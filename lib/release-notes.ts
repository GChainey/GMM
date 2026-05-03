// What's New — long-form release notes rendered at /release-notes.
//
// The terse Codex (lib/changelog.ts) is the in-app log. These entries are the
// outward-facing posts: a tagline for social, a lede paragraph, an optional
// live demo of the actual app component, then a few paragraphs of detail in
// the same Renaissance tone as the Codex.

export type ReleaseDemoKind =
  | "herald-hero"
  | "day-complete"
  | "lockout-grace"
  | "daily-recap"
  | "visages";

export interface ReleaseSection {
  heading?: string;
  paragraphs: string[];
}

export interface ReleaseNote {
  slug: string;
  date: string;
  pr?: number;
  title: string;
  tagline: string;
  lede: string;
  demoKind?: ReleaseDemoKind;
  demoCaption?: string;
  sections: ReleaseSection[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    slug: "the-pantheon-at-dusk",
    date: "2026-05-03",
    pr: 44,
    title: "The pantheon at dusk — every proof gathered, every word collected",
    tagline:
      "Each pantheon now opens with a recap parchment of the day's proofs, and a single collective post for the whole order to share.",
    lede:
      "A pantheon used to be a list of names. From today, every pantheon page opens with a recap parchment that gathers the day's witnesses in one place — proof of rite, image, film or song, laid out beside their bearers, with the still-awaited noted at the foot.",
    demoKind: "daily-recap",
    demoCaption:
      "The recap parchment, with three offerings and one collective post — exactly as it appears at the head of every pantheon today.",
    sections: [
      {
        heading: "A single post for the whole order",
        paragraphs: [
          "Beneath the gathering sits a collective post — a single parchment per pantheon per day where any mortal of the order may set down a few words for the whole, attach a relic if the day asks for one, and let the rest of the pantheon read it as they pass. The latest hand to touch it is named at the top, with the hour of inscription.",
          "Should the day pass without a word, the parchment quietly invites one. Should a mortal wish to amend, the Amend button reopens the draft; should they wish to undo, Clear lifts both word and relic and returns the parchment to silence.",
        ],
      },
      {
        heading: "The shareable rite no longer stumbles on a film",
        paragraphs: [
          "The shareable daily rite no longer leaves a void where a non-image relic was offered. Where a HEIC, a film, or a song stands as proof, the parchment now still bears the May progress mosaic and a small italicised note declaring that the relic is inscribed — rather than the empty box that quietly broke the share card before.",
        ],
      },
    ],
  },
  {
    slug: "lockout-flips-at-noon",
    date: "2026-05-02",
    pr: 42,
    title: "The lockout flips at noon — yesterday lingers in grace",
    tagline:
      "A forgotten evening no longer condemns thee at midnight. Yesterday's rites linger in grace until tomorrow's noon bell.",
    lede:
      "A mortal who forgot the evening's rites, or who kept the night tech-free, is no longer condemned at the stroke of midnight. Yesterday's rites now linger in grace until the noon bell of today — strikes do not accrue, streaks do not break, and falls do not trigger until that lockout flips.",
    demoKind: "lockout-grace",
    demoCaption:
      "What greets a mortal who lands at the altar before noon and yesterday is still incomplete — every unmarked rite surfaces, ready to be sealed in time.",
    sections: [
      {
        heading: "The altar offers yesterday for inscription",
        paragraphs: [
          "Whensoever a mortal lands on the altar before noon and yesterday is still incomplete, the day is offered for inscription right there — a small parchment crowned with 'Yesterday — the lockout flips at noon' surfaces every unmarked daily rite. Mark them as thou wouldst today, and the ledger updates as if the deed were done in time.",
          "The benediction parchment for the day still rises the moment the day is sealed, but it now whispers that the day stays open until noon tomorrow — should a mortal wish to amend a rite by morning's light, the way is open.",
        ],
      },
      {
        heading: "The mosaic honours the grace",
        paragraphs: [
          "The reckoning of cells in thy pantheon's mosaic also honours the grace: a yesterday still in the lockout window glows pending-divine, not crimson-fallen, until the noon bell rings.",
        ],
      },
    ],
  },
  {
    slug: "herald-hero-card",
    date: "2026-05-02",
    pr: 43,
    title: "A herald's parchment crowns each pantheon",
    tagline:
      "Every pantheon now opens with a herald's parchment — the day, the standing, and which mortals have answered the rite, all at a glance.",
    lede:
      "Each pantheon now opens with a herald's parchment that proclaims, in a single look, the day of the ritual, the pantheon's standing thus far, and which mortals have already made today's offering. No more scrolling a roll of names to find who is yet to inscribe.",
    demoKind: "herald-hero",
    demoCaption:
      "The herald, live — this is the same component that crowns every pantheon page today, fed sample data.",
    sections: [
      {
        heading: "Two rolls of headshots",
        paragraphs: [
          "Beneath the headline are two rolls of headshots: the kept — wreathed in gilt with a quiet ✓ at their shoulder — and the awaited, set apart in muted greyscale until they too have inscribed the day's rites. The visages are drawn from each mortal's own visage, be it an uploaded portrait or their summoned face.",
          "A pair of quiet bars charts the pantheon's progress: the gilded one shows the share of all daily rites kept across days already past, and the slimmer azure one tracks how far the month itself hath run.",
        ],
      },
      {
        heading: "Restraint at the dawn",
        paragraphs: [
          "On the dawn of the ritual, when no day is yet past, the herald withholds the standing-bar (lest it shame mortals for a day still in motion) and shows only the day-tally and today's two rolls of names.",
          "Mortals whose vow holds only weekly tallies or monthly totals are noted at the foot — they are not reckoned by the day, and so do not loiter in the awaited column.",
        ],
      },
    ],
  },
  {
    slug: "altar-first-buttons-benediction",
    date: "2026-05-01",
    pr: 40,
    title: "The altar is the first screen — and the day is sealed with a benediction",
    tagline:
      "The daily rite is now the entry. Buttons replace tickboxes, and the day ends with a benediction parchment ready for the public square.",
    lede:
      "Upon entering the temple, a mortal is now delivered straight unto the daily altar. The Pantheon view remains, a step aside in the cloister, but the dawn's rites are the first thing thine eyes shall meet — for that is the work of the day.",
    demoKind: "day-complete",
    demoCaption:
      "Tap the rite to mark it. When every offering is kept, the benediction parchment rises — try it.",
    sections: [
      {
        heading: "Buttons, not tickboxes",
        paragraphs: [
          "The little parchment-tick beside each rite is no more. In its place stands a clear button — 'Mark done', or for an abstinence, 'Mark refrained' — that inscribes the deed at the very stroke of thy hand. No save, no second confirmation: the moment thou art done, so it is written. Once inscribed, the button gleams gilt and reads 'Done'; touch it again to recant.",
          "For those who finish the day's rites in one sitting, a single 'Mark all complete' sigil now crowns each pantheon's list, that all outstanding deeds may be sealed at once.",
        ],
      },
      {
        heading: "The benediction parchment",
        paragraphs: [
          "When every rite is kept, the benediction parchment now also bears the names of thy pantheons — a single sigil per pantheon to step from thine own day into the wider square, that thou mayst behold how thy fellows fare today.",
          "A quiet bell sounds and a parchment of the day's deeds is raised before thee, ready to be sent unto the public square. The dialog bears the day's shareable card alongside the three sigils of dispatch: Share to summon the native sheet, Download to save the parchment for the feed of thy choosing, or Copy link for the unfurling preview.",
        ],
      },
    ],
  },
  {
    slug: "the-many-faces",
    date: "2026-04-29",
    title: "The temple has many faces — visages, summoned",
    tagline:
      "Every mortal carries a visage. Upload thine own portrait, or let the temple summon a face from thy name.",
    lede:
      "A mortal is more than a name on a roll. The profile now bears a visage — an uploaded portrait, or a face the temple summons from thy name with a small chisel of sliders for eye shape, hue, gaze, and depth.",
    demoKind: "visages",
    demoCaption:
      "A handful of summoned visages, drawn live in the browser. Each is fully procedural — no images shipped.",
    sections: [
      {
        heading: "Wherever a name appears, a face follows",
        paragraphs: [
          "The visage now travels with thee through the temple: at the head of the cloister, beside thy name on the pantheon roll, in the herald's two rolls of kept and awaited, and at the corner of the shareable parchment thou strikest at day's end.",
          "Where a mortal hath uploaded a portrait, that portrait stands. Where they have not, the summoned face takes its place — and the artisan's chisel at /profile lets each one be tuned. The mortal who would prefer a coloured tile may simply pick a hue and a style and be done.",
        ],
      },
    ],
  },
];

export function getRelease(slug: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((r) => r.slug === slug);
}

export function getNeighbors(slug: string): {
  prev: ReleaseNote | null;
  next: ReleaseNote | null;
} {
  const idx = RELEASE_NOTES.findIndex((r) => r.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  // Newest first, so "next" (newer) is idx-1 and "prev" (older) is idx+1.
  return {
    next: idx > 0 ? RELEASE_NOTES[idx - 1] : null,
    prev: idx < RELEASE_NOTES.length - 1 ? RELEASE_NOTES[idx + 1] : null,
  };
}
