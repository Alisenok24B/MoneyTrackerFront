"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getToken } from "@/utils/jwt";
import styles from "./EditProfileModal.module.css";
import React from 'react';

type Props = {
  open: boolean;
  initialDisplayName?: string;
  onOpenChange: (open: boolean) => void;
  onChanged: (newDisplayName: string) => void;
};

export function EditProfileModal({ open, initialDisplayName, onOpenChange, onChanged }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Сбросить имя при каждом открытии
  React.useEffect(() => {
    if (open) setDisplayName(initialDisplayName || "");
  }, [open, initialDisplayName]);

  const handleSave = async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = getToken();
      const res = await fetch("http://localhost:3333/api/user/change-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      onChanged(displayName);
      onOpenChange(false);
    } catch {
      setErr("Ошибка обновления профиля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modalContent}>
        <DialogHeader>
          <DialogTitle>Изменить имя профиля</DialogTitle>
        </DialogHeader>
        <Input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Ваше имя"
          autoFocus
          disabled={loading}
        />
        {err && <div style={{ color: "red", marginTop: 4 }}>{err}</div>}
        <DialogFooter className={styles.footer}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button className={styles.editBtn} onClick={handleSave} disabled={loading || !displayName.trim()}>
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}