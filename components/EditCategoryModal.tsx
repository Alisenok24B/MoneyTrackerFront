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
  Home
} from "lucide-react";
import styles from "./EditCategoryModal.module.css";
import { getToken } from "@/utils/jwt";

const ICONS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "food", label: "Еда", icon: ShoppingCart },
  { value: "transport", label: "Транспорт", icon: Car },
  { value: "shopping", label: "Покупки", icon: Package },
  { value: "salary", label: "Зарплата", icon: Banknote },
  { value: "rent", label: "Аренда", icon: Home },
  { value: "transfer", label: "Перевод", icon: ArrowRightLeft },
];

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICONS.map(i => [i.value, i.icon])
);

function typeLabel(type: "expense" | "income" | "transfer") {
  if (type === "income") return "Доход";
  if (type === "expense") return "Расход";
  if (type === "transfer") return "Перевод";
  return type;
}

type Props = {
  categoryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

type Category = {
  _id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  icon: string;
  isDefault: boolean;
};

async function fetchCategory(id: string): Promise<Category | null> {
  try {
    const token = getToken();
    const res = await fetch(`http://localhost:3333/api/categories/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.category || null;
  } catch {
    return null;
  }
}

async function patchCategory(id: string, name: string, icon: string) {
  const token = getToken();
  const res = await fetch(`http://localhost:3333/api/categories/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, icon }),
  });
  if (!res.ok) {
    throw new Error("Ошибка сохранения");
  }
  return await res.json();
}

export function EditCategoryModal({ categoryId, open, onOpenChange, onUpdated }: Props) {
  const [category, setCategory] = React.useState<Category | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [edit, setEdit] = React.useState(false);
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Для кастомного выпадающего списка
  const [iconDropdown, setIconDropdown] = React.useState(false);

  // Загрузка категории
  React.useEffect(() => {
    if (open && categoryId) {
      setLoading(true);
      setEdit(false);
      setErr(null);
      setIconDropdown(false);
      fetchCategory(categoryId)
        .then(cat => {
          setCategory(cat);
          setName(cat?.name ?? "");
          setIcon(cat?.icon ?? "");
        })
        .finally(() => setLoading(false));
    } else if (!open) {
      setCategory(null);
      setEdit(false);
      setErr(null);
      setIconDropdown(false);
    }
  }, [open, categoryId]);

  // Кнопка "Отменить"
  const cancelEdit = () => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
    }
    setEdit(false);
    setErr(null);
    setIconDropdown(false);
  };

  // Кнопка "Сохранить"
  const saveEdit = async () => {
    if (!category) return;
    setSaving(true);
    setErr(null);
    try {
      await patchCategory(category._id, name.trim(), icon);
      if (onUpdated) onUpdated();
      setEdit(false);
      setCategory({ ...category, name: name.trim(), icon });
    } catch {
      setErr("Не удалось сохранить изменения");
    } finally {
      setSaving(false);
      setIconDropdown(false);
    }
  };

  const IconView = category ? ICON_MAP[category.icon] || ShoppingCart : ShoppingCart;
  const SelectedIcon = icon ? ICON_MAP[icon] || ShoppingCart : ShoppingCart;

  // Клик вне дропдауна
  React.useEffect(() => {
    if (!iconDropdown) return;
    const handle = (e: MouseEvent) => {
      const modal = document.getElementById("iconDropdownRoot");
      if (modal && !modal.contains(e.target as Node)) {
        setIconDropdown(false);
      }
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [iconDropdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modalContent} style={{ border: "none" }}>
        <DialogHeader>
          <DialogTitle>Категория</DialogTitle>
        </DialogHeader>
        {loading && <div className={styles.loading}>Загрузка…</div>}
        {!loading && category && (
          <div className={styles.categoryContent}>
          {/* Только в режиме просмотра — кружок с иконкой */}
          {!edit && (
            <div className={styles.iconTopWrap}>
              <IconView className={styles.iconTop} />
            </div>
          )}
          {/* Только в режиме редактирования — дропдаун без кружка */}
          {edit && (
            <div
              id="iconDropdownRoot"
              className={styles.iconDropdownWrap}
              style={{ margin: "0 auto 8px auto" }}
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
          )}
          {/* Название */}
          <div className={styles.row}>
            <span className={styles.label}>Название:</span>
            {edit ? (
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={saving}
                className={styles.inputEdit}
                maxLength={32}
                autoFocus
              />
            ) : (
              <span className={styles.value}>{category.name}</span>
            )}
          </div>
          {/* Тип */}
          <div className={styles.row}>
            <span className={styles.label}>Тип:</span>
            <span className={styles.value}>{typeLabel(category.type)}</span>
          </div>
        </div>
        )}
        {err && <div style={{ color: "#ed6d7a", marginTop: 7, fontSize: "0.98em" }}>{err}</div>}
        <DialogFooter className={styles.footer}>
          {!edit && !category?.isDefault && (
            <Button onClick={() => setEdit(true)} className={styles.editBtn}>
              Редактировать
            </Button>
          )}
          {edit && (
            <>
              <Button onClick={cancelEdit} variant="ghost" disabled={saving}>
                Отменить
              </Button>
              <Button
                onClick={saveEdit}
                disabled={saving || !name.trim() || !icon}
                className={styles.editBtn}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
            </>
          )}
          {!edit && (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}