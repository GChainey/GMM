"use client";

import { useCallback } from "react";
import { usePatch } from "@web-kits/audio/react";
import { SOUND_PATCH, type SoundName } from "@/lib/sounds";

export function useSounds() {
  const patch = usePatch(SOUND_PATCH);
  const play = useCallback(
    (name: SoundName) => {
      try {
        patch.play(name);
      } catch {
        // AudioContext may be unavailable (e.g. before first gesture); ignore.
      }
    },
    [patch],
  );
  return play;
}
