import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserRow } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { demoPantheonExists, seedDemoPantheonCore } from "@/lib/demo-seed";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DemoDrawer } from "@/components/demo-drawer";
import { CommandPalette } from "@/components/command-palette";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const row = await ensureUserRow();

  // Auto-seed the Demo Council on first authenticated load when demo mode is on
  // and it doesn't exist yet. The drawer's Wipe button is the escape hatch.
  if (row && isDemoMode() && !(await demoPantheonExists())) {
    await seedDemoPantheonCore(row.id);
  }

  let navUser = {
    name: row?.displayName ?? "Mortal",
    email: null as string | null,
    avatarUrl: row?.avatarUrl ?? null,
  };

  if (row) {
    const [fresh] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.id))
      .limit(1);

    const clerk = await currentUser();
    const email =
      clerk?.emailAddresses?.find(
        (e) => e.id === clerk.primaryEmailAddressId,
      )?.emailAddress ?? null;

    navUser = {
      name: fresh?.displayName ?? row.displayName,
      email,
      avatarUrl: fresh?.avatarUrl ?? row.avatarUrl,
    };
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={navUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-border/60 px-6 py-6 text-center font-display text-xs tracking-widest text-muted-foreground md:px-10">
          God Mode May · MMXXVI
        </footer>
      </SidebarInset>
      <CommandPalette />
      {isDemoMode() && <DemoDrawer />}
    </SidebarProvider>
  );
}
