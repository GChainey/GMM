"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FeedbackDialog } from "@/components/feedback-dialog"

const TITLES: { match: (path: string) => boolean; label: string }[] = [
  { match: (p) => p === "/dashboard", label: "Altar" },
  { match: (p) => p.startsWith("/check-in"), label: "Daily Rite" },
  { match: (p) => p === "/groups" || p === "/groups/new", label: "Pantheons" },
  { match: (p) => p.startsWith("/groups/"), label: "Pantheon" },
  { match: (p) => p.startsWith("/profile"), label: "Visage" },
  { match: (p) => p.startsWith("/changelog"), label: "Codex" },
]

function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.label ?? "G·M·M"
}

export function SiteHeader() {
  const pathname = usePathname()
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <h1 className="font-display text-base tracking-[0.25em]">
          {titleFor(pathname)}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <FeedbackDialog />
        </div>
      </div>
    </header>
  )
}
