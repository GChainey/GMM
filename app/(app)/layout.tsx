import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ensureUserRow } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureUserRow();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/85 px-6 py-4 backdrop-blur md:px-10">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="font-display text-lg tracking-[0.3em]"
          >
            G·M·M
          </Link>
          <nav className="hidden items-center gap-6 font-display text-sm tracking-widest text-muted-foreground md:flex">
            <Link href="/dashboard" className="hover:text-foreground">
              Altar
            </Link>
            <Link href="/check-in" className="hover:text-foreground">
              Daily Rite
            </Link>
            <Link href="/groups" className="hover:text-foreground">
              Pantheons
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox:
                  "h-9 w-9 ring-2 ring-gold/60 ring-offset-2 ring-offset-background",
              },
            }}
          />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/60 px-6 py-6 text-center font-display text-xs tracking-widest text-muted-foreground md:px-10">
        God Mode May · MMXXVI
      </footer>
    </div>
  );
}
