import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANGELOG } from "@/lib/changelog";

export default function ChangelogPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 md:px-10">
      <header>
        <p className="font-display text-xs tracking-[0.4em] text-muted-foreground">
          THE CODEX
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
          Changelog
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Recently inscribed upon the temple walls. Found a bug or have a vow
          to add? Use the <span className="font-semibold">Feedback</span>{" "}
          button at the top of every page.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {CHANGELOG.map((entry) => (
          <Card key={entry.date} className="marble-card">
            <CardHeader>
              <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {entry.date}
              </p>
              <CardTitle className="font-display text-2xl tracking-tight">
                {entry.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
                {entry.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
