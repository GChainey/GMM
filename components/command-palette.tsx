"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CheckIcon,
  CircleIcon,
  MoonIcon,
  PaintbrushIcon,
  SunIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { THEMES, type ThemeValue } from "@/components/theme-provider";

const THEME_ICONS: Record<ThemeValue, React.ComponentType<{ className?: string }>> = {
  system: CircleIcon,
  minimal: PaintbrushIcon,
  light: SunIcon,
  dark: MoonIcon,
  parchment: PaintbrushIcon,
  midnight: MoonIcon,
};

const NAV_PAGES: { label: string; href: string; hint: string }[] = [
  { label: "Altar", href: "/dashboard", hint: "The daily dashboard" },
  { label: "Daily Rite", href: "/check-in", hint: "Mark today's deeds" },
  { label: "Pantheons", href: "/groups", hint: "Thy bound councils" },
  { label: "Visage", href: "/profile", hint: "Thy mortal portrait" },
  { label: "Codex", href: "/changelog", hint: "Recent decrees" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // Allow demo drawer's Cmd+Shift+K to take precedence; we only handle plain ⌘K.
      if (e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runCommand = useCallback((fn: () => void) => {
    setOpen(false);
    // Defer the action so the dialog can finish closing first.
    setTimeout(fn, 0);
  }, []);

  const activeTheme = useMemo<ThemeValue>(() => (theme as ThemeValue) ?? "minimal", [theme]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Switch theme or jump to a page."
    >
      <CommandInput placeholder="Summon a command, a theme, or a page…" />
      <CommandList>
        <CommandEmpty>No rite found.</CommandEmpty>

        <CommandGroup heading="Theme">
          {THEMES.map((t) => {
            const Icon = THEME_ICONS[t.value];
            const isActive = activeTheme === t.value;
            return (
              <CommandItem
                key={t.value}
                value={`theme ${t.value} ${t.label} ${t.hint}`}
                onSelect={() => runCommand(() => setTheme(t.value))}
              >
                <Icon className="text-muted-foreground" />
                <span className="font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.hint}</span>
                {isActive && <CheckIcon className="ml-auto text-accent" />}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {NAV_PAGES.map((page) => (
            <CommandItem
              key={page.href}
              value={`nav ${page.label} ${page.hint} ${page.href}`}
              onSelect={() => runCommand(() => router.push(page.href))}
            >
              <span className="font-medium">{page.label}</span>
              <span className="text-xs text-muted-foreground">{page.hint}</span>
              <CommandShortcut>{page.href}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
