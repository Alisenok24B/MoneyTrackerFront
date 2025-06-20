"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getToken } from "@/utils/jwt";
import React from "react";
import styles from './RemovePeerModal.module.css'

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerName?: string;
  peerId?: string;
  onRemoved?: () => void;
};

export function RemovePeerModal({ open, onOpenChange, peerName, peerId, onRemoved }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRemove = async () => {
    if (!peerId) return;
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch("http://localhost:3333/api/access/terminate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ peerId }),
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      onOpenChange(false);
      onRemoved?.();
    } catch {
      setError("Ошибка удаления пользователя");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modalContent}>
      <DialogHeader className={styles.dialogHeader}>
        <DialogTitle className={styles.dialogTitle}>Разорвать совместный доступ?</DialogTitle>
        </DialogHeader>
        <div className={styles.confirmText}>
          {`Вы точно хотите разорвать совместный доступ с пользователем "${peerName}"?`}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <DialogFooter className={styles.footer}>
        <Button className={styles.confirmBtn} onClick={() => onOpenChange(false)} disabled={loading}>
            Нет
          </Button>
          <Button
            className={styles.cancelBtn}
            onClick={handleRemove}
            disabled={loading}
          >
            {loading ? "Удаляем…" : "Да"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}