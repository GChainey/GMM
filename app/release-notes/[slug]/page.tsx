import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  RELEASE_NOTES,
  getNeighbors,
  getRelease,
} from "@/lib/release-notes";

import {
  ReleaseDemo,
  ReleaseDemoFrame,
} from "../_components/release-demo";
import { ReleaseShell } from "../_components/release-shell";

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

export function generateStaticParams() {
  return RELEASE_NOTES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const release = getRelease(slug);
  if (!release) return {};
  return {
    title: `${release.title} — God Mode May`,
    description: release.tagline,
    openGraph: {
      title: release.title,
      description: release.tagline,
      type: "article",
      publishedTime: release.date,
    },
    twitter: {
      card: "summary_large_image",
      title: release.title,
      description: release.tagline,
    },
  };
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = getRelease(slug);
  if (!release) notFound();

  const { prev, next } = getNeighbors(slug);

  return (
    <ReleaseShell>
      <main className="flex flex-1 flex-col">
        <article className="mx-auto w-full max-w-3xl px-6 py-12 md:px-10 md:py-20">
          <Link
            href="/release-notes"
            className="inline-flex items-center gap-1 font-display text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All release notes
          </Link>

          <header className="mt-6 flex flex-col gap-3">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              {formatDate(release.date)}
              {release.pr && (
                <span className="ml-3 normal-case tracking-normal text-muted-foreground/70">
                  · #{release.pr}
                </span>
              )}
            </p>
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
              {release.title}
            </h1>
            <p className="font-display text-lg italic text-muted-foreground md:text-xl">
              {release.tagline}
            </p>
          </header>

          <div className="mt-8 flex flex-col gap-6 text-base leading-relaxed">
            <p>{release.lede}</p>

            {release.demoKind && (
              <ReleaseDemoFrame caption={release.demoCaption}>
                <ReleaseDemo kind={release.demoKind} />
              </ReleaseDemoFrame>
            )}

            {release.sections.map((section, i) => (
              <section key={i} className="flex flex-col gap-3">
                {section.heading && (
                  <h2 className="mt-4 font-display text-2xl tracking-tight">
                    {section.heading}
                  </h2>
                )}
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </section>
            ))}
          </div>

          <nav className="mt-16 flex items-stretch justify-between gap-4 border-t border-border/60 pt-8">
            {prev ? (
              <Link
                href={`/release-notes/${prev.slug}`}
                className="group flex max-w-[48%] flex-1 flex-col gap-1 rounded-md border border-border/60 p-4 transition-colors hover:border-gold/40"
              >
                <span className="inline-flex items-center gap-1 font-display text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                  <ArrowLeft className="h-3 w-3" /> Older
                </span>
                <span className="font-display text-sm leading-tight">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {next ? (
              <Link
                href={`/release-notes/${next.slug}`}
                className="group flex max-w-[48%] flex-1 flex-col items-end gap-1 rounded-md border border-border/60 p-4 text-right transition-colors hover:border-gold/40"
              >
                <span className="inline-flex items-center gap-1 font-display text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
                  Newer <ArrowRight className="h-3 w-3" />
                </span>
                <span className="font-display text-sm leading-tight">
                  {next.title}
                </span>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
          </nav>
        </article>
      </main>
    </ReleaseShell>
  );
}
