import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  formatShareDate,
  getPersonalDailyShareData,
  isValidShareDate,
} from "@/lib/share-data";
import { ShareActions } from "@/components/share-actions";

interface PageProps {
  params: Promise<{ userId: string; date: string }>;
}

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, date } = await params;
  if (!isValidShareDate(date)) return { title: "Daily rite" };
  const origin = await originFromHeaders();
  const imageUrl = `${origin}/share/daily/${userId}/${date}/opengraph-image`;
  const url = `${origin}/share/daily/${userId}/${date}`;
  const title = `Daily rite — ${formatShareDate(date)}`;
  const description = "A pledge inscribed in May. The deeds of the day.";
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

export default async function DailySharePage({ params }: PageProps) {
  const { userId, date } = await params;
  if (!isValidShareDate(date)) notFound();
  const data = await getPersonalDailyShareData(userId, date);
  if (!data) notFound();

  const origin = await originFromHeaders();
  const shareUrl = `${origin}/share/daily/${userId}/${date}`;
  const imageUrl = `${shareUrl}/opengraph-image`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          A SHAREABLE DAILY RITE
        </p>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {data.user.displayName} · {formatShareDate(date)}
        </h1>
        <p className="text-sm italic text-muted-foreground">
          A vow inscribed, the day&apos;s deeds bound to it. Thy proof, thy progress, thy parchment.
        </p>
      </header>

      <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Daily rite for ${data.user.displayName} on ${formatShareDate(date)}`}
          width={1200}
          height={630}
          className="h-auto w-full"
        />
      </section>

      <ShareActions
        imageUrl={imageUrl}
        shareUrl={shareUrl}
        shareTitle={`Daily rite — ${formatShareDate(date)}`}
        shareText={`${data.user.displayName} — ${data.doneToday}/${data.totalToday} rites kept on ${formatShareDate(date)}.`}
        downloadFilename={`lome-daily-${data.user.displayName.toLowerCase().replace(/\s+/g, "-")}-${date}.png`}
      />

      <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="font-display tracking-[0.3em]">✦ LOME</span>
        <Link href="/check-in" className="underline">
          Back to the altar
        </Link>
      </footer>
    </main>
  );
}
