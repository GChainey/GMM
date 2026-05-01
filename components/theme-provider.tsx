"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

/* ---------------- Mode (next-themes drives this) ---------------- */

export const MODES = [
  { value: "system", label: "Default", hint: "Follow thy device's hour" },
  { value: "light", label: "Light", hint: "Vellum and gilt" },
  { value: "dark", label: "Dark", hint: "The midnight vigil" },
] as const;

export type ModeValue = (typeof MODES)[number]["value"];

/* ---------------- Flavor (custom context) ---------------- */

export const FLAVORS = [
  { value: "basic", label: "Basic", hint: "Plain surfaces, neutral accents" },
  { value: "athenian", label: "Athenian", hint: "Marble, gilt, divine purple" },
  { value: "robot", label: "Robot", hint: "Sharp edges, neon cyan & magenta" },
] as const;

export type FlavorValue = (typeof FLAVORS)[number]["value"];

const DEFAULT_FLAVOR: FlavorValue = "athenian";
const FLAVOR_STORAGE_KEY = "gmm-flavor";

type FlavorContextValue = {
  flavor: FlavorValue;
  setFlavor: (value: FlavorValue) => void;
};

const FlavorContext = createContext<FlavorContextValue | null>(null);

export function useFlavor() {
  const ctx = useContext(FlavorContext);
  if (!ctx) throw new Error("useFlavor must be used inside <ThemeProvider>");
  return ctx;
}

function FlavorProvider({ children }: { children: ReactNode }) {
  // SSR-safe initial: read from the data-flavor attribute the inline script
  // sets in <body>. Falls back to DEFAULT_FLAVOR when missing (first ever load).
  const [flavor, setFlavorState] = useState<FlavorValue>(() => {
    if (typeof document === "undefined") return DEFAULT_FLAVOR;
    const attr = document.documentElement.getAttribute("data-flavor");
    return isFlavor(attr) ? attr : DEFAULT_FLAVOR;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-flavor", flavor);
  }, [flavor]);

  const setFlavor = useCallback((next: FlavorValue) => {
    try {
      window.localStorage.setItem(FLAVOR_STORAGE_KEY, next);
    } catch {
      // Storage may be denied (private mode). The attribute still updates.
    }
    setFlavorState(next);
  }, []);

  return (
    <FlavorContext.Provider value={{ flavor, setFlavor }}>
      {children}
    </FlavorContext.Provider>
  );
}

function isFlavor(value: string | null): value is FlavorValue {
  return value !== null && FLAVORS.some((f) => f.value === value);
}

/* ---------------- Inline init script (no FOUC) ----------------
 * Render this once in <body> as the first child. It reads the persisted
 * flavor from localStorage and applies the data-flavor attribute before
 * React hydrates, mirroring what next-themes does for class. */

export function FlavorInitScript() {
  const code = `(function(){try{var k="${FLAVOR_STORAGE_KEY}";var v=localStorage.getItem(k);var allowed=${JSON.stringify(FLAVORS.map((f) => f.value))};if(!v||allowed.indexOf(v)===-1){v="${DEFAULT_FLAVOR}";}document.documentElement.setAttribute("data-flavor",v);}catch(e){document.documentElement.setAttribute("data-flavor","${DEFAULT_FLAVOR}");}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/* ---------------- Combined provider ---------------- */

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark"]}
      disableTransitionOnChange
      {...props}
    >
      <FlavorProvider>{children}</FlavorProvider>
    </NextThemesProvider>
  );
}
