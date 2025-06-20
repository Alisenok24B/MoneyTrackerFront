"use client";

import React, { createContext, useContext, useCallback, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/utils/jwt";

export type Notification = {
  _id: string;
  text: string;
  read: boolean;
  createdAt: string;
  requiresResponse?: boolean;
  inviteId?: string;
};

type NotiContextType = {
  unreadCount: number;
  reloadNotifications: () => void;
  onNotificationPush: (cb: () => void) => void; // <<<< новое
};

const NotificationsContext = createContext<NotiContextType>({
  unreadCount: 0,
  reloadNotifications: () => {},
  onNotificationPush: () => {},
});

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const notiPushListeners = useRef<(() => void)[]>([]);

  // Позволяет любому компоненту подписаться на пуш
  const onNotificationPush = useCallback((cb: () => void) => {
    notiPushListeners.current.push(cb);
    return () => {
      notiPushListeners.current = notiPushListeners.current.filter(f => f !== cb);
    };
  }, []);

  const reloadNotifications = useCallback(() => {
    const token = getToken();
    fetch("http://localhost:3333/api/notifications/unread", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    })
      .then((res) => res.ok ? res.json() : { notifications: [] })
      .then((data) => setUnreadCount(Array.isArray(data.notifications) ? data.notifications.length : 0))
      .catch(() => setUnreadCount(0));
  }, []);

  React.useEffect(() => {
    let socket: Socket | null = null;
    const token = getToken();
    reloadNotifications();

    if (token) {
      socket = io("http://localhost:3008/notifications", {
        transports: ["websocket"],
        auth: { token },
      });

      socket.on("notification", () => {
        reloadNotifications();
        // Вызываем всех подписчиков (например, модалка)
        notiPushListeners.current.forEach((cb) => cb());
      });

      socket.on("connect", () => console.log("Socket.IO connected!"));
      socket.on("connect_error", (err) => console.log("Socket.IO connect error:", err));
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [reloadNotifications, onNotificationPush]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, reloadNotifications, onNotificationPush }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);