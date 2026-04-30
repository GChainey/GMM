import type { SoundDefinition, SoundPatch } from "@web-kits/audio";

const SOUNDS = {
  pledgeInscribed: {
    layers: [
      {
        source: { type: "sine", frequency: 392 },
        envelope: { attack: 0.01, decay: 1.1 },
        gain: 0.22,
      },
      {
        source: { type: "sine", frequency: 587 },
        envelope: { attack: 0.01, decay: 1.3 },
        gain: 0.16,
        delay: 0.12,
      },
      {
        source: { type: "sine", frequency: 784 },
        envelope: { attack: 0.01, decay: 1.6 },
        gain: 0.11,
        delay: 0.24,
      },
    ],
    effects: [{ type: "reverb", decay: 1.4, mix: 0.25 }],
  },
  riteAdded: {
    source: { type: "triangle", frequency: { start: 620, end: 920 } },
    envelope: { decay: 0.07 },
    gain: 0.18,
  },
  riteRemoved: {
    source: { type: "sine", frequency: { start: 520, end: 220 } },
    envelope: { decay: 0.1 },
    gain: 0.14,
  },
  riteChecked: {
    layers: [
      {
        source: { type: "sine", frequency: { start: 660, end: 880 } },
        envelope: { attack: 0.005, decay: 0.12 },
        gain: 0.22,
      },
      {
        source: { type: "noise", color: "white" },
        filter: { type: "highpass", frequency: 2200 },
        envelope: { decay: 0.02 },
        gain: 0.05,
      },
    ],
  },
  riteUnchecked: {
    source: { type: "sine", frequency: { start: 700, end: 360 } },
    envelope: { decay: 0.12 },
    gain: 0.14,
  },
  tallyInscribed: {
    layers: [
      {
        source: { type: "triangle", frequency: 740 },
        envelope: { attack: 0.005, decay: 0.18 },
        gain: 0.18,
      },
      {
        source: { type: "triangle", frequency: 988 },
        envelope: { attack: 0.005, decay: 0.26 },
        gain: 0.14,
        delay: 0.07,
      },
    ],
    effects: [{ type: "reverb", decay: 0.6, mix: 0.2 }],
  },
  proofInscribed: {
    layers: [
      {
        source: { type: "noise", color: "white" },
        filter: { type: "bandpass", frequency: 2200, resonance: 1.5 },
        envelope: { decay: 0.04 },
        gain: 0.12,
      },
      {
        source: { type: "sine", frequency: { start: 1400, end: 700 } },
        envelope: { decay: 0.06 },
        gain: 0.08,
      },
    ],
  },
  switchOffered: {
    layers: [
      {
        source: { type: "triangle", frequency: { start: 440, end: 660 } },
        envelope: { attack: 0.005, decay: 0.18 },
        gain: 0.16,
      },
      {
        source: { type: "triangle", frequency: { start: 660, end: 440 } },
        envelope: { attack: 0.005, decay: 0.18 },
        gain: 0.14,
        delay: 0.08,
      },
    ],
    effects: [{ type: "reverb", decay: 0.5, mix: 0.18 }],
  },
  switchAccepted: {
    layers: [
      {
        source: { type: "sine", frequency: 523 },
        envelope: { attack: 0.005, decay: 0.18 },
        gain: 0.18,
      },
      {
        source: { type: "sine", frequency: 880 },
        envelope: { attack: 0.005, decay: 0.22 },
        gain: 0.18,
        delay: 0.06,
      },
      {
        source: { type: "noise", color: "white" },
        filter: { type: "bandpass", frequency: 3200, resonance: 1.2 },
        envelope: { decay: 0.05 },
        gain: 0.04,
        delay: 0.12,
      },
    ],
    effects: [{ type: "reverb", decay: 0.7, mix: 0.22 }],
  },
  outcomeShipped: {
    layers: [
      {
        source: { type: "triangle", frequency: 523 },
        envelope: { attack: 0.01, decay: 0.55 },
        gain: 0.22,
      },
      {
        source: { type: "triangle", frequency: 659 },
        envelope: { attack: 0.01, decay: 0.75 },
        gain: 0.2,
        delay: 0.16,
      },
      {
        source: { type: "triangle", frequency: 784 },
        envelope: { attack: 0.01, decay: 1.3 },
        gain: 0.2,
        delay: 0.32,
      },
    ],
    effects: [{ type: "reverb", decay: 1.0, mix: 0.3 }],
  },
} satisfies Record<string, SoundDefinition>;

export type SoundName = keyof typeof SOUNDS;

export const SOUND_PATCH: SoundPatch = {
  name: "god-mode-may",
  description: "Synthesized rites and bells for pledges, tallies, and outcomes.",
  sounds: SOUNDS,
};
