"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import styles from "./RemoveCategoryModal.module.css";

type Props = {
  open: boolean;
  categoryName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RemoveCategoryModal({ open, categoryName, loading, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className={styles.modalContent} style={{ border: "none" }}>
        <DialogHeader>
          <DialogTitle>Удаление категории</DialogTitle>
        </DialogHeader>
        <div className={styles.contentText}>
          Вы уверены, что хотите удалить категорию <span className={styles.catName}>&laquo;{categoryName}&raquo;</span>?
        </div>
        <DialogFooter className={styles.footer}>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Нет
          </Button>
          <Button onClick={onConfirm} className={styles.deleteBtn} disabled={loading}>
            {loading ? "Удаление…" : "Да, удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}