"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export const THEMES = [
  { value: "system", label: "System", hint: "Follow the world's hour" },
  { value: "minimal", label: "Minimal", hint: "Marble & gilt — the original altar" },
  { value: "light", label: "Light", hint: "Pristine vellum, no ornament" },
  { value: "dark", label: "Dark", hint: "The midnight vigil" },
  { value: "parchment", label: "Parchment", hint: "Aged scriptorium, ink-brown" },
  { value: "midnight", label: "Midnight", hint: "Deep indigo of the divine" },
] as const;

export type ThemeValue = (typeof THEMES)[number]["value"];

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="minimal"
      enableSystem
      themes={THEMES.map((t) => t.value).filter((v) => v !== "system")}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
