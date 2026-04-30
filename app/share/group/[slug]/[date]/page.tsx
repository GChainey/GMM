import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  formatShareDate,
  getGroupRoundupShareData,
  isValidShareDate,
} from "@/lib/share-data";
import { ShareActions } from "@/components/share-actions";

interface PageProps {
  params: Promise<{ slug: string; date: string }>;
}

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, date } = await params;
  if (!isValidShareDate(date)) return { title: "Pantheon roundup" };
  const origin = await originFromHeaders();
  const imageUrl = `${origin}/share/group/${slug}/${date}/opengraph-image`;
  const url = `${origin}/share/group/${slug}/${date}`;
  const title = `Pantheon roundup — ${formatShareDate(date)}`;
  const description = "Today in the pantheon: who ascends, who stumbles, who was first.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function GroupSharePage({ params }: PageProps) {
  const { slug, date } = await params;
  if (!isValidShareDate(date)) notFound();
  const data = await getGroupRoundupShareData(slug, date);
  if (!data) notFound();

  const origin = await originFromHeaders();
  const shareUrl = `${origin}/share/group/${slug}/${date}`;
  const imageUrl = `${shareUrl}/opengraph-image`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          A SHAREABLE PANTHEON ROUNDUP
        </p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {data.group.name} · {formatShareDate(date)}
        </h1>
        <p className="text-sm italic text-muted-foreground">
          The pantheon at dusk — who keeps the path, who stumbles, who was first to seal the day.
        </p>
      </header>

      <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Pantheon roundup for ${data.group.name} on ${formatShareDate(date)}`}
          width={1200}
          height={630}
          className="h-auto w-full"
        />
      </section>

      <ShareActions
        imageUrl={imageUrl}
        shareUrl={shareUrl}
        shareTitle={`${data.group.name} — ${formatShareDate(date)}`}
        shareText={`${data.group.name} on ${formatShareDate(date)}: ${data.ascendingCount} ascending, ${data.fallenCount} fallen.`}
        downloadFilename={`lome-${slug}-${date}.png`}
      />

      <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="font-display tracking-[0.3em]">✦ LOME</span>
        <Link href={`/groups/${slug}`} className="underline">
          Back to the pantheon
        </Link>
      </footer>
    </main>
  );
}
