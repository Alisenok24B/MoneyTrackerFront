"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import styles from "./SidebarNotificationsButton.module.css";
import { SidebarNotificationsModal } from "./SidebarNotificationsModal";
import { useNotifications } from '@/utils/notifications';

export function SidebarNotificationsButton() {
    const pathname = usePathname();
    const [modalOpen, setModalOpen] = React.useState(false);
    const { unreadCount, reloadNotifications } = useNotifications();
  
    const isActive = pathname === "/notifications";
  
    return (
      <>
        <button
          className={[
            styles.sidebarNavItem,
            isActive ? styles["sidebarNavItem--active"] : "",
          ].join(" ")}
          onClick={() => setModalOpen(true)}
          aria-label="Уведомления"
          type="button"
        >
          <Bell size={20} />
          <span>Уведомления</span>
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </button>
        <SidebarNotificationsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onAnyAction={reloadNotifications} // кастом-проп, смотри ниже
        />
      </>
    );
}