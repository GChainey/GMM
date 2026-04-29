"use client";

import { SoundProvider as WebKitSoundProvider } from "@web-kits/audio/react";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  return <WebKitSoundProvider volume={0.85}>{children}</WebKitSoundProvider>;
}
