"use client";

import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export function SidebarWithVisibility() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }
  return <Sidebar />;
}