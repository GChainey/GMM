---
name: web-kits-audio
description: Declarative audio synthesis for the web using @web-kits/audio. Use when adding sound effects, UI audio cues, or synthesized sounds (pops, clicks, alerts, notifications) to a web app, or when the user mentions @web-kits/audio, defineSound, sound patches, useSound, usePatch, or installing patches via the CLI. Triggers on "add a sound effect", "play a pop/click/blip", "synthesize audio", "UI sound", "wire up audio cues", "use @web-kits/audio", "defineSound", "useSound hook", "sound patch", or installing audio patches from the registry.
---

# @web-kits/audio

@web-kits/audio is a declarative audio synthesis library for the web. Define sounds as plain objects and play them with a single function call.

## Quickstart

Install `@web-kits/audio` with your package manager of choice.

| Manager | Command |
| --- | --- |
| npm | `npm install @web-kits/audio` |
| yarn | `yarn add @web-kits/audio` |
| pnpm | `pnpm add @web-kits/audio` |
| bun | `bun add @web-kits/audio` |

Define a sound as a plain object and call the returned function to play it.

```ts
import { defineSound } from "@web-kits/audio";

const pop = defineSound({
  source: { type: "sine", frequency: { start: 400, end: 150 } },
  envelope: { decay: 0.05 },
  gain: 0.35,
});

pop();
```

## Get Started

- **TypeScript** (`/getting-started/typescript`) — Understand the basic usage.
- **React** (`/getting-started/react`) — Learn the React hooks.

## Integrate

- **Sound Patches** (`/integrations/patches`) — Bundling sounds as patches.
- **React Hooks** (`/integrations/react`) — `useSound`, `usePatch`, and more.
- **CLI** (`/cli`) — Install patches from the registry, GitHub, or disk.

## Information

- **API Reference** (`/api/sounds/define-sound`) — Full API documentation.
- **Changelog** (`/resources/changelog`) — What's new in each release.
