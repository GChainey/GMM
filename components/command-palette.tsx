"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronRightIcon,
  MonitorIcon,
  MoonIcon,
  MoonStarIcon,
  ScrollIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const MODE_OPTIONS: Option[] = [
  { value: "system", label: "System", hint: "Follow thy device's hour", Icon: MonitorIcon },
  { value: "light", label: "Light", hint: "Pristine vellum, no ornament", Icon: SunIcon },
  { value: "dark", label: "Dark", hint: "The midnight vigil", Icon: MoonIcon },
];

const THEME_OPTIONS: Option[] = [
  {
    value: "minimal",
    label: "Minimal",
    hint: "Marble & gilt — the original altar",
    Icon: SparklesIcon,
  },
  {
    value: "parchment",
    label: "Parchment",
    hint: "Aged scriptorium, ink-brown",
    Icon: ScrollIcon,
  },
  {
    value: "midnight",
    label: "Midnight",
    hint: "Deep indigo of the divine",
    Icon: MoonStarIcon,
  },
];

const NAV_PAGES = [
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

  const handleSelectTheme = (value: string) => {
    setTheme(value);
  };

  const handleNavigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="font-display tracking-widest">Command</SheetTitle>
          <SheetDescription>
            Choose a mode, a theme, or a destination. ⌘K toggles this drawer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <RadioSection
            label="Mode"
            description="Brightness scheme. System tracks thy device."
            options={MODE_OPTIONS}
            active={theme}
            onSelect={handleSelectTheme}
          />

          <RadioSection
            label="Theme"
            description="The flavor of the temple."
            options={THEME_OPTIONS}
            active={theme}
            onSelect={handleSelectTheme}
          />

          <section>
            <p className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
              Navigate
            </p>
            <div className="mt-2 flex flex-col gap-1">
              {NAV_PAGES.map((p) => (
                <button
                  key={p.href}
                  type="button"
                  onClick={() => handleNavigate(p.href)}
                  className="group flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/30"
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.hint}</span>
                  <ChevronRightIcon className="ml-auto size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RadioSection({
  label,
  description,
  options,
  active,
  onSelect,
}: {
  label: string;
  description: string;
  options: Option[];
  active: string | undefined;
  onSelect: (value: string) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
        {label}
      </legend>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-col gap-1" role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const isActive = active === opt.value;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:bg-accent/30",
                isActive && "border-border/80 bg-accent/20",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isActive
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40",
                )}
              >
                {isActive && (
                  <span className="size-1.5 rounded-full bg-primary-foreground" />
                )}
              </span>
              <Icon className="size-4 text-muted-foreground" />
              <span className="font-medium">{opt.label}</span>
              <span className="truncate text-xs text-muted-foreground">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
