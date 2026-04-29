"use client"

import * as React from "react"
import Link from "next/link"
import {
  FlameIcon,
  SunriseIcon,
  UsersIcon,
  CircleUserRoundIcon,
  ScrollTextIcon,
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
  { title: "Altar", url: "/dashboard", icon: <FlameIcon /> },
  { title: "Daily Rite", url: "/check-in", icon: <SunriseIcon /> },
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/dashboard" />}
            >
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
