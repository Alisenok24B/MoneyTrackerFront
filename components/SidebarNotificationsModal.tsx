"use client";

import * as React from "react";
import { X, Bell } from "lucide-react";
import styles from "./SidebarNotificationsModal.module.css";
import { getToken } from "@/utils/jwt";
import { useNotifications } from '@/utils/notifications';

type Notification = {
  _id: string;
  text: string;
  read: boolean;
  createdAt: string;
  requiresResponse?: boolean;
  inviteId?: string;
};

async function fetchUnreadNotifications(): Promise<Notification[]> {
  try {
    const token = getToken();
    const res = await fetch("http://localhost:3333/api/notifications/unread", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch {
    return [];
  }
}

async function markRead(notificationId: string) {
  const token = getToken();
  await fetch("http://localhost:3333/api/notifications/read", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ notificationId }),
  });
}

async function respondToInvite(inviteId: string, action: "accept" | "reject") {
  const token = getToken();
  await fetch("http://localhost:3333/api/access/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ inviteId, action }),
  });
}

export function SidebarNotificationsModal({
  open,
  onOpenChange,
  onAnyAction
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkedRead?: () => void;
  onAnyAction?: () => void;
}) {
  const { onNotificationPush } = useNotifications();
  const [loading, setLoading] = React.useState(true);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  // Для анимации кнопок/дизейбла пока идёт действие
  const [pending, setPending] = React.useState<string | null>(null);

  // Получаем список уведомлений при открытии
  const refetch = React.useCallback(() => {
    setLoading(true);
    fetchUnreadNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    refetch();
    // Подписка
    const unsubscribe = onNotificationPush(() => {
      refetch();
    });
    // отписка при закрытии/размонтировании
    return unsubscribe;
  }, [open, refetch, onNotificationPush]);

  async function handleRead(id: string) {
    setPending(id);
    await markRead(id);
    setPending(null);
    refetch();
    onAnyAction?.(); // обновить счётчик глобально
  }

  async function handleInviteAction(inviteId: string, notifId: string, action: "accept" | "reject") {
    setPending(notifId);
    await respondToInvite(inviteId, action);
    await markRead(notifId);
    setPending(null);
    refetch();
    onAnyAction?.();
  }

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} tabIndex={-1} onClick={() => onOpenChange(false)}>
      <div
        className={styles.modal}
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <Bell size={19} />
          <span className={styles.title}>Уведомления</span>
          <button className={styles.closeBtn} onClick={() => onOpenChange(false)}>
            <X size={19} />
          </button>
        </div>
        <div className={styles.content}>
          {loading && <div className={styles.loading}>Загрузка…</div>}
          {!loading && notifications.length === 0 && (
            <div className={styles.empty}>Нет новых уведомлений</div>
          )}
          {!loading &&
            notifications.map((notif) => (
              <div key={notif._id} className={styles.notifItem}>
                <div className={styles.notifText}>{notif.text}</div>
                {notif.requiresResponse && notif.inviteId ? (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className={styles.acceptBtn}
                      disabled={pending === notif._id}
                      onClick={() => handleInviteAction(notif.inviteId!, notif._id, "accept")}
                    >
                      Принять
                    </button>
                    <button
                      className={styles.rejectBtn}
                      disabled={pending === notif._id}
                      onClick={() => handleInviteAction(notif.inviteId!, notif._id, "reject")}
                    >
                      Отклонить
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.markReadBtn}
                    disabled={pending === notif._id}
                    title="Пометить как прочитанное"
                    onClick={() => handleRead(notif._id)}
                  >
                    Прочитано
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}