/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "./AddPeerModal.module.css"; // Создай, если нужно (или переиспользуй общий стиль)
import { getToken } from "@/utils/jwt";

interface AddPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
}

interface SearchUser {
  id: string;
  email: string;
  displayName?: string;
}

export function AddPeerModal({ open, onOpenChange, onAdded }: AddPeerModalProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<SearchUser | null>(null);
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setInviteError(null);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setLoading(true);
      setInviteError(null);
      try {
        const token = getToken();
        const res = await fetch("http://localhost:3333/api/user/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ query: query.trim() }),
        });
        if (!res.ok) throw new Error("Ошибка поиска");
        const data = await res.json();
        setResults(data.users || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [query]);

  const handleInvite = async () => {
    if (!selected) return;
    setInviteLoading(true);
    setInviteError(null);
    try {
      const token = getToken();
      const res = await fetch("http://localhost:3333/api/access/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toUserId: selected.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Ошибка приглашения");
      }
      if (onAdded) onAdded();
      onOpenChange(false);
    } catch (e: any) {
      setInviteError(e?.message || "Ошибка приглашения");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modalContent} style={{ border: "none", minWidth: 380 }}>
        <DialogHeader>
          <DialogTitle>Добавить пользователя</DialogTitle>
        </DialogHeader>
        <div>
          <Input
            type="text"
            inputMode="search"
            name="search-user"
            autoFocus
            placeholder="Поиск по email или имени"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelected(null);
              setInviteError(null);
            }}
            disabled={inviteLoading}
          />
          {!!results.length && !selected && (
            <div className={styles.dropdown}>
              {results.map(user => (
                <div
                  key={user.id}
                  className={styles.dropdownItem}
                  onClick={() => setSelected(user)}
                >
                  <span className={styles.avatarMini}>
                    {(user.displayName || user.email)
                      .split(" ")
                      .map(w => w[0])
                      .join("")
                      .toUpperCase()
                      .substring(0, 2)}
                  </span>
                  <span>
                    <span style={{ fontWeight: 500 }}>{user.displayName || user.email}</span>
                    <span style={{ color: "#bac9e5", fontSize: "0.93em", marginLeft: 7 }}>
                      {user.email}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div className={styles.selectedUser}>
              <span className={styles.avatarMini}>
                {(selected.displayName || selected.email)
                  .split(" ")
                  .map(w => w[0])
                  .join("")
                  .toUpperCase()
                  .substring(0, 2)}
              </span>
              <span style={{ fontWeight: 500 }}>{selected.displayName || selected.email}</span>
              <span style={{ color: "#bac9e5", fontSize: "0.94em", marginLeft: 7 }}>
                {selected.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} style={{ marginLeft: 10 }}>
                Сбросить
              </Button>
            </div>
          )}
        </div>
        {inviteError && <div className={styles.error}>{inviteError}</div>}
        <DialogFooter className={styles.footer}>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!selected || inviteLoading}
            className={styles.editBtn}
          >
            {inviteLoading ? "Приглашение..." : "Пригласить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}