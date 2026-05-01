"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronRightIcon,
  CircleIcon,
  CpuIcon,
  ColumnsIcon,
  MonitorIcon,
  MoonIcon,
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
import {
  FLAVORS,
  MODES,
  useFlavor,
  type FlavorValue,
  type ModeValue,
} from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<ModeValue, React.ComponentType<{ className?: string }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const FLAVOR_ICONS: Record<FlavorValue, React.ComponentType<{ className?: string }>> = {
  basic: CircleIcon,
  athenian: SparklesIcon,
  robot: CpuIcon,
};

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
  const { theme: mode, setTheme: setMode } = useTheme();
  const { flavor, setFlavor } = useFlavor();

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
            Mode and theme are independent. ⌘K toggles this drawer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <RadioSection<ModeValue>
            label="Mode"
            description="Brightness scheme. Default tracks thy device."
            options={MODES.map((m) => ({
              value: m.value,
              label: m.label,
              hint: m.hint,
              Icon: MODE_ICONS[m.value],
            }))}
            active={(mode as ModeValue) ?? "system"}
            onSelect={(value) => setMode(value)}
          />

          <RadioSection<FlavorValue>
            label="Theme"
            description="Flavor of the temple — accents, ornament, edges."
            options={FLAVORS.map((f) => ({
              value: f.value,
              label: f.label,
              hint: f.hint,
              Icon: FLAVOR_ICONS[f.value],
            }))}
            active={flavor}
            onSelect={(value) => setFlavor(value)}
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
                  <ColumnsIcon className="size-4 text-muted-foreground" />
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

type RadioOption<T extends string> = {
  value: T;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function RadioSection<T extends string>({
  label,
  description,
  options,
  active,
  onSelect,
}: {
  label: string;
  description: string;
  options: RadioOption<T>[];
  active: T;
  onSelect: (value: T) => void;
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
