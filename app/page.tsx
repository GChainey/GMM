import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, Flame, Crown } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="font-display text-xl tracking-[0.3em]">
          G·M·M
        </Link>
        <nav className="flex items-center gap-2">
          {userId ? (
            <Button asChild className="gilded font-display tracking-widest">
              <Link href="/dashboard">Enter</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="font-display tracking-widest"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="gilded font-display tracking-widest">
                <Link href="/sign-up">Begin</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden px-6 pt-12 pb-24 md:px-12 md:pt-24 md:pb-32">
          <div className="mx-auto max-w-5xl text-center">
            <p className="font-display text-xs tracking-[0.5em] text-muted-foreground md:text-sm">
              MMXXVI · ANNO DOMINI
            </p>
            <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-tight md:text-8xl lg:text-[8.5rem]">
              <span className="text-gilded">God Mode</span>
              <br />
              <span className="text-foreground">May</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-balance font-display text-lg italic text-muted-foreground md:text-xl">
              A solemn pact between mortals. Thirty‑one days of unbroken ritual.
              Complete your pledge each day and ascend; falter once and fall.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {userId ? (
                <Button
                  asChild
                  size="lg"
                  className="gilded font-display tracking-widest"
                >
                  <Link href="/dashboard">Enter the Pantheon</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="gilded font-display tracking-widest"
                  >
                    <Link href="/sign-up">Take the pledge</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="font-display tracking-widest"
                  >
                    <Link href="/groups">Browse groups</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 px-6 py-16 md:px-12 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <Step
              icon={<ScrollText className="h-6 w-6" />}
              title="Inscribe thy pledge"
              body="Join a group, write a solemn vow, and list the daily rites you will perform from May 1st to May 31st."
            />
            <Step
              icon={<Flame className="h-6 w-6" />}
              title="Endure the daily rite"
              body="Each day, mark every activity complete. A photo of proof, a streak that grows. Miss the mark and your strikes accrue."
            />
            <Step
              icon={<Crown className="h-6 w-6" />}
              title="Ascend or fall"
              body="Survive every day inside your group's strike limit and ascend to godhood. Exceed it and your name joins the Fallen."
            />
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/50 px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl md:text-4xl">
              The Sacred Sheet
            </h2>
            <p className="mt-4 font-display italic text-muted-foreground md:text-lg">
              For years past, this ritual lived in a humble spreadsheet. The
              names of the faithful, their vows, their rewards, and their
              punishments. This is its temple.
            </p>
          </div>
        </section>

        <footer className="px-6 py-10 text-center font-display text-xs tracking-widest text-muted-foreground md:px-12">
          God Mode May · MMXXVI · Sola Disciplina
        </footer>
      </main>
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="marble-card border-border/60">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
          {icon}
        </div>
        <h3 className="font-display text-xl">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
