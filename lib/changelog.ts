export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-04-29",
    title: "Marble sidebar, mutable visage",
    items: [
      "New monastery sidebar — Altar, Daily Rite, Pantheons, Visage, Codex — with active-state highlighting and ⌘B to collapse.",
      "Sidebar portrait now mirrors thy chosen visage from /profile.",
      "Feedback raised to the temple banner — speak from any page, no longer buried beneath the Codex.",
      "Profile gains the facehash artisan: sliders for eye shape, hue, gaze, and depth, with live preview, save, and restore-to-default.",
      "Quietly: middleware moved to proxy.ts on the Node runtime so Clerk no longer falters at the gate.",
      "Quietly: `npm run dev:port` auto-finds a free port so parallel workspaces stop colliding on 3000.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Visages, vows, and tallies",
    items: [
      "Profile page — upload thy own avatar, or let a generated face stand in.",
      "Three kinds of vow: Do daily, Abstain daily, and Monthly tally (e.g. 75 km).",
      "Daily check-in shows abstain rites in red and tallies with a live progress bar.",
      "Optional daily journal at the bottom of the check-in.",
      "Pantheon page now shows monthly progress bars for tallies.",
    ],
  },
  {
    date: "2026-04-25",
    title: "First light",
    items: [
      "Sign in, found a pantheon, take the vow, and inscribe daily rites.",
      "Mark each rite, attach photo proof, and watch the May grid fill in.",
      "Strikes, streaks, and the four mortal states: pending, ascending, fallen, ascended.",
    ],
  },
];
