// components/ui/AppLayout.tsx
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AccountsProvider } from "@/utils/account";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/login" || pathname === "/register";

  return (
    <AccountsProvider>
      <div style={{
        display: "flex",
        minHeight: "100dvh",
        width: "100vw",
        overflow: "hidden",
      }}>
        {!hideSidebar && (
          <aside
            style={{
              minWidth: "23.5vw",
              maxWidth: 340,
              flexShrink: 0,
              zIndex: 5,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Sidebar />
          </aside>
        )}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </AccountsProvider>
  );
}