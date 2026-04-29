export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-04-29",
    title: "Charity mode — the fall feeds a cause",
    items: [
      "Pantheons gain a Charity mode. When a mortal falls, their forfeit need not be silver in a jar — let it flow to a worthy cause instead.",
      "Founders may choose the rule of the rite: each mortal names their own charity (a fall then feeds the winner's cause), or the founder picks one cause for all (every fall feeds the same coffer).",
      "Inscribe thy chosen cause alongside thy reward and punishment. Names appear on the pantheon page, and a link may be set for the truly diligent.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Visage save restored, gaze made plain",
    items: [
      "Saving thy visage no longer angers the server — the artisan's chisel reaches the marble. (A wayward import was summoning React rites in the wrong sanctum.)",
      "The gaze rail now actually moves the eyes within the face, in all four directions of the compass and their corners — and works at any depth, even None.",
      "The 3D depth tilt has been re-aligned with the gaze: looking right tips right, looking up tips up, as the gods intended.",
    ],
  },
  {
    date: "2026-04-29",
    title: "One rite, one outcome",
    items: [
      "Outcomes leave the pledge and bind to each rite. A habit of guitar each dawn ships a recital; an hour of writing each night ships an EP. The deliverable belongs to the deed, not the pantheon.",
      "Inscribe an outcome beside every rite when thou amend thy pledge. Each may be marked shipped on its own from the dashboard or pantheon — every trophy stands separately.",
      "Existing outcomes were carried forward onto the first rite of each pledge so naught was lost in the move.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Cloister narrows to icons",
    items: [
      "Sidebar now collapses to a slender column of sigils — press ⌘B and the names retreat, leaving only the icons of Altar, Daily Rite, Pantheons, Visage, and Codex. A pyramid stands watch where the brand once read.",
      "Hovering an icon while collapsed surfaces its title in a small tooltip, so no rite is lost to brevity.",
      "Quietly: dropped the inset frame around the cloister — it sat oddly against our marble palette. The sidebar now meets the page edge to edge.",
      "Quietly: `npm run dev` itself now hunts for a free port from 3000 upward, so summoning the temple in a second Conductor cell no longer fails on a held gate. The pinned variant lives on as `dev:fixed`.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Toward a month's-end ship",
    items: [
      "Pledges gain an Outcome — the deliverable thou wilt show the pantheon on May 31. A recital, a release, an exhibition, a demo. Daily rites lead somewhere now.",
      "Inscribe thy outcome alongside reward and punishment; it locks with the rest of the pledge at midnight on May 1.",
      "When the day comes, mark thine outcome shipped from the pantheon page — a green seal stands in for the tally.",
      "The dashboard and pantheon view now surface every mortal's outcome beside their pledge.",
    ],
  },
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
