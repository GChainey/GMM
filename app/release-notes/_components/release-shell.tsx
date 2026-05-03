import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";

export async function ReleaseShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border/60 px-6 py-5 md:px-12">
        <div className="flex items-baseline gap-6">
          <Link href="/" className="font-display text-xl tracking-[0.3em]">
            G·M·M
          </Link>
          <Link
            href="/release-notes"
            className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          >
            Release notes
          </Link>
        </div>
        <nav className="flex items-center gap-2">
          {userId ? (
            <Button asChild className="gilded font-display tracking-widest">
              <Link href="/check-in">Enter</Link>
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
      {children}
      <footer className="border-t border-border/60 px-6 py-10 text-center font-display text-xs tracking-widest text-muted-foreground md:px-12">
        God Mode May · MMXXVI · Sola Disciplina
      </footer>
    </div>
  );
}
