"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Car,
  Package,
  Banknote,
  ArrowRightLeft,
  Home,
} from "lucide-react";
import styles from "./AddCategoryModal.module.css";
import { getToken } from "@/utils/jwt";

const ICONS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "food", label: "Еда", icon: ShoppingCart },
  { value: "transport", label: "Транспорт", icon: Car },
  { value: "shopping", label: "Покупки", icon: Package },
  { value: "salary", label: "Зарплата", icon: Banknote },
  { value: "rent", label: "Аренда", icon: Home },
  { value: "transfer", label: "Перевод", icon: ArrowRightLeft },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void;
};

async function addCategory(
  name: string,
  type: "income" | "expense",
  icon: string
) {
  const token = getToken();
  const res = await fetch("http://localhost:3333/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, type, icon }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Ошибка создания категории");
  }
  return await res.json();
}

export function AddCategoryModal({ open, onOpenChange, onAdded }: Props) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"income" | "expense">("expense");
  const [icon, setIcon] = React.useState("food");
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Для кастомного выпадающего списка иконок
  const [iconDropdown, setIconDropdown] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("expense");
      setIcon("food");
      setErr(null);
      setSaving(false);
      setIconDropdown(false);
    }
  }, [open]);

  const SelectedIcon = icon ? ICONS.find(i => i.value === icon)?.icon || ShoppingCart : ShoppingCart;

  // Клик вне дропдауна
  React.useEffect(() => {
    if (!iconDropdown) return;
    const handle = (e: MouseEvent) => {
      const modal = document.getElementById("iconDropdownRootAddCat");
      if (modal && !modal.contains(e.target as Node)) {
        setIconDropdown(false);
      }
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [iconDropdown]);

  // Добавить
  const handleSubmit = async () => {
    if (!name.trim() || !type || !icon) {
      setErr("Все поля обязательны");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await addCategory(name.trim(), type, icon);
      onOpenChange(false);
      if (onAdded) onAdded();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e.message || "Ошибка создания");
    } finally {
      setSaving(false);
      setIconDropdown(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modalContent} style={{ border: "none" }}>
        <DialogHeader>
          <DialogTitle>Добавить категорию</DialogTitle>
        </DialogHeader>
        <div className={styles.form}>
          {/* Кастомный дропдаун иконки */}
          <div className={styles.iconFieldWrap}>
            <div
              id="iconDropdownRootAddCat"
              className={styles.iconDropdownWrap}
            >
              <button
                className={styles.iconDropdownBtn}
                onClick={() => setIconDropdown((v) => !v)}
                type="button"
                disabled={saving}
              >
                <SelectedIcon className={styles.iconTop} />
                <span className={styles.iconLabelBtn}>
                  {ICONS.find(i => i.value === icon)?.label ?? "Выбрать"}
                </span>
              </button>
              {iconDropdown && (
                <div className={styles.iconDropdownList}>
                  {ICONS.map(opt => (
                    <div
                      key={opt.value}
                      className={styles.iconDropdownItem}
                      onClick={() => {
                        setIcon(opt.value);
                        setIconDropdown(false);
                      }}
                    >
                      <opt.icon className={styles.iconDropdownIcon} />
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Имя */}
          <div className={styles.inputRow}>
            <span className={styles.label}>Название:</span>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              className={styles.inputEdit}
              maxLength={32}
              autoFocus
            />
          </div>
          {/* Тип */}
          <div className={styles.inputRow}>
            <span className={styles.label}>Тип:</span>
            <div className={styles.typeSwitcher}>
              <button
                type="button"
                className={
                  type === "expense"
                    ? styles.typeBtnActive
                    : styles.typeBtn
                }
                disabled={saving}
                onClick={() => setType("expense")}
              >
                Расход
              </button>
              <button
                type="button"
                className={
                  type === "income"
                    ? styles.typeBtnActive
                    : styles.typeBtn
                }
                disabled={saving}
                onClick={() => setType("income")}
              >
                Доход
              </button>
            </div>
          </div>
        </div>
        {err && <div className={styles.error}>{err}</div>}
        <DialogFooter className={styles.footer}>
          <Button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !type || !icon}
            className={styles.addBtn}
          >
            {saving ? "Добавление…" : "Добавить"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}