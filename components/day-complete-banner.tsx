import Link from "next/link";
import { ArrowRight, Crown, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DayCompleteBannerProps {
  userId: string;
  date: string;
  riteCount: number;
  pantheons: { slug: string; name: string }[];
}

export function DayCompleteBanner({
  userId,
  date,
  riteCount,
  pantheons,
}: DayCompleteBannerProps) {
  return (
    <Card className="marble-card border-gold/60 bg-gold/[0.06]">
      <CardContent className="flex flex-col gap-5 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-gold/15 text-gold">
            <Crown className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-gold">
              The day is sealed
            </p>
            <h2 className="font-display text-3xl leading-tight tracking-tight md:text-4xl">
              Thy rites are complete
            </h2>
            <p className="text-sm italic text-muted-foreground">
              {riteCount === 1
                ? "One rite, faithfully kept."
                : `All ${riteCount} rites kept this day.`}{" "}
              Now go forth — share the parchment, or look upon thy pantheon.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="lg"
            className="gilded font-display tracking-widest"
          >
            <Link href={`/share/daily/${userId}/${date}`}>
              <Share2 className="mr-2 h-4 w-4" />
              Share today&apos;s parchment
            </Link>
          </Button>
        </div>

        {pantheons.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-gold/30 pt-4">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
              See how thy pantheon fares today
            </p>
            <div className="flex flex-col gap-2">
              {pantheons.map((p) => (
                <Button
                  key={p.slug}
                  asChild
                  variant="outline"
                  className="justify-between font-display tracking-widest"
                >
                  <Link href={`/groups/${p.slug}`}>
                    <span>{p.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
