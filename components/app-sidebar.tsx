"use client"

import * as React from "react"
import Link from "next/link"
import {
  FlameIcon,
  SunriseIcon,
  UsersIcon,
  CircleUserRoundIcon,
  ScrollTextIcon,
  PyramidIcon,
} from "lucide-react"

import { NavMain, type NavMainItem } from "@/components/nav-main"
import { NavUser, type NavUserProps } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const NAV_MAIN: NavMainItem[] = [
  { title: "Daily Rite", url: "/check-in", icon: <SunriseIcon /> },
  { title: "Altar", url: "/dashboard", icon: <FlameIcon /> },
  { title: "Pantheons", url: "/groups", icon: <UsersIcon /> },
  { title: "Visage", url: "/profile", icon: <CircleUserRoundIcon /> },
  { title: "Codex", url: "/changelog", icon: <ScrollTextIcon /> },
]

interface AppSidebarProps
  extends React.ComponentProps<typeof Sidebar> {
  user: NavUserProps["user"]
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="p-1.5! group-data-[collapsible=icon]:p-0!"
              tooltip="God Mode May"
              render={<Link href="/check-in" />}
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <PyramidIcon className="size-4" />
              </div>
              <span className="font-display text-base tracking-[0.3em]">
                G·M·M
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={NAV_MAIN} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
