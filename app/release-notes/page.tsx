import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { RELEASE_NOTES } from "@/lib/release-notes";

import { ReleaseShell } from "./_components/release-shell";

export const metadata: Metadata = {
  title: "Release Notes — God Mode May",
  description:
    "What's new in the temple — every shipped feature, with a live preview of the actual component.",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${MONTHS[Number(mm) - 1]} ${Number(dd)}, ${yyyy}`;
}

export default async function ReleaseNotesPage() {
  return (
    <ReleaseShell>
      <main className="flex flex-1 flex-col">
        <section className="px-6 pt-16 pb-10 md:px-12 md:pt-24">
          <div className="mx-auto max-w-3xl">
            <p className="font-display text-xs tracking-[0.5em] text-muted-foreground">
              WHAT IS NEW
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              <span className="text-gilded">Release</span> notes
            </h1>
            <p className="mt-6 max-w-2xl text-balance font-display text-lg italic text-muted-foreground md:text-xl">
              Every shipped feature, with a live preview of the actual
              component — not a screenshot.
            </p>
          </div>
        </section>

        <section className="px-6 pb-24 md:px-12">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {RELEASE_NOTES.map((release) => (
              <Link
                key={release.slug}
                href={`/release-notes/${release.slug}`}
                className="group block"
              >
                <Card className="marble-card border-border/60 transition-colors group-hover:border-gold/40">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
                      {formatDate(release.date)}
                    </p>
                    <h2 className="font-display text-2xl leading-tight tracking-tight md:text-3xl">
                      {release.title}
                    </h2>
                    <p className="text-muted-foreground">
                      {release.tagline}
                    </p>
                    <span className="inline-flex items-center gap-1 font-display text-xs uppercase tracking-[0.3em] text-gold/80 group-hover:text-gold">
                      Read on{" "}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </ReleaseShell>
  );
}
