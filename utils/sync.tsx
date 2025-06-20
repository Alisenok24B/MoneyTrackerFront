"use client";

import React, { createContext, useContext, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "@/utils/jwt";

// Тип события, которое приходит от sync WebSocket
export type SyncEvent = {
  type: "transaction" | "account" | "profile";
  action: "create" | "update" | "delete";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

type SyncContextType = {
  /**
   * Позволяет подписаться на peer-sync события
   * @param filter — функция-фильтр по типу события (например, event => event.type === "transaction")
   * @param cb — колбек, вызывается при каждом событии, если filter вернёт true
   * @returns функция-отписка
   */
  onPeerSync: (filter: (event: SyncEvent) => boolean, cb: (event: SyncEvent) => void) => () => void;
};

const SyncContext = createContext<SyncContextType>({
  onPeerSync: () => () => {},
});

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const syncListeners = useRef<
    { filter: (event: SyncEvent) => boolean; cb: (event: SyncEvent) => void }[]
  >([]);

  const onPeerSync = useCallback((filter: (event: SyncEvent) => boolean, cb: (event: SyncEvent) => void) => {
    const item = { filter, cb };
    syncListeners.current.push(item);
    return () => {
      syncListeners.current = syncListeners.current.filter(l => l !== item);
    };
  }, []);

  React.useEffect(() => {
    let socket: Socket | null = null;
    const token = getToken();
    if (token) {
      // !!! обязательно порт и namespace совпадает с backend !!!
      socket = io("http://localhost:3008/sync", {
        transports: ["websocket"],
        auth: { token },
      });

      socket.on("peer-sync", (event: SyncEvent) => {
        // Можно логировать для дебага
        // console.log("[Sync] peer-sync event received", event);
        syncListeners.current.forEach(listener => {
          if (listener.filter(event)) listener.cb(event);
        });
      });

      socket.on("connect", () => console.log("Sync WS connected!"));
      socket.on("connect_error", (err) => console.log("Sync WS connect error:", err));
      socket.on("disconnect", () => console.log("Sync WS disconnected"));
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <SyncContext.Provider value={{ onPeerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);