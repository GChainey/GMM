export interface ChangelogEntry {
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-04-30",
    title: "The second vow — a path of redemption",
    items: [
      "A fallen mortal is no longer condemned by the first stumble. The temple now offers a single dusk — three days from the fall — to take the second vow and re-enter ascension as the penitent.",
      "The penance is plain: thy daily input redoubles for the days that remain. A 5km rite becomes 10km. Tallies receive a new target — what thou hast already logged, plus twice thy original daily pace through May 31. The outcome thou pledged stands; only the cost of getting there.",
      "For daily rites, the bar is sterner still: from the moment the second vow is sealed, no further strike may be borne. A single missed rite ends the path for good.",
      "The penitent are visible to the pantheon — their new bar, their countdown, their reckoning. The Switching is closed to them; chaos hath no purchase on a sealed vow.",
      "Tallies that fall hopelessly behind shall now be marked fallen mid-month, so the dusk for the second vow opens whilst there is still light to climb back. Make it through May 31 under the doubled bar and thy glyph shall read Reclaimed.",
    ],
  },
  {
    date: "2026-04-30",
    title: "The Switching — chaos enters the pantheon",
    items: [
      "Any mortal in a pantheon may now invoke The Switching: name another and offer to swap thy daily goal with theirs, for this day only.",
      "The other must accept ere chaos takes hold. Once sealed, each mortal walks the other's pledge — the rites of the day rewritten by mutual consent.",
      "Strikes and streaks remain on thine own ledger; the labour shifts, the vow stands. The check-in altar surfaces thy partner's rites in a divine-blue panel so thou shalt not forget whose path thou walkest.",
      "Each mortal may switch with but one other per day, and only during the May ritual. Pending offers may be withdrawn or declined; accepted swaps cannot be undone — thou hast made thy bed of chaos, now lie in it.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Demo, on a single breath",
    items: [
      "`npm run dev` is now the whole demo. Demo mode is auto-on outside production, and the Demo Council founds itself on thy first sign-in — no env flag, no seed button.",
      "The clock parks at May 15 by default when wall-time is outside the challenge window, so the seeded mortals already have a fortnight of strikes and streaks the moment thou dost arrive at the altar.",
      "Set NEXT_PUBLIC_DEMO_MODE=0 to dismiss the drawer when thou wouldst test the bare app; the Wipe button still empties the council on demand.",
      "Quietly: `npm run dev` now runs migrations before starting the server, so a freshly pulled branch is one command from altar to ⌘K. `dev:no-migrate` skips it for offline work.",
    ],
  },
  {
    date: "2026-04-29",
    title: "A cloister out of time",
    items: [
      "Demo mode unsealed: set NEXT_PUBLIC_DEMO_MODE=1 and a wand-marked drawer appears at ⌘K, granting dominion over the calendar.",
      "Travel forward and back through May, jump to any date, or release the override to resume real time. Pledges no longer lock when the demo clock pretends it's April.",
      "Found the Demo Council with a single tap — six fictive mortals (Apollo, Athena, Hermes, Artemis, Dionysus, Hephaestus) take their vows and back-fill rites to the demo today, each at their own habit rate.",
      "Roll today, mark a mortal complete, mark a mortal missed, or wipe the council clean — all from the drawer, all without leaving the page.",
    ],
  },
  {
    date: "2026-04-29",
    title: "Bells beneath the marble",
    items: [
      "The temple finds its voice. A small chorus of synthesized bells now answers thy chief deeds — soft enough for a quiet office, gone in a breath.",
      "Inscribing a pledge tolls a triple chime. Adding or unbinding a rite earns a brief pop. Each daily check brings a confident tick; tallies inscribe with a gold-leaf shimmer.",
      "Proofs land with a shutter's whisper, and a rite's outcome, once shipped, ascends through three triumphant tones.",
      "Quietly: the rites are pure synthesis — no audio files shipped — and we honour `prefers-reduced-motion`, so any mortal who hath asked for silence shall receive it.",
      "Quietly: `npm run dev` now binds to `$CONDUCTOR_PORT` when set, so a Conductor cell keeps the same port across runs and never wanders onto another sanctum's gate.",
    ],
  },
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
