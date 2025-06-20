/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Edit,
  X,
  Plus,
  ShoppingCart,
  Car,
  Package,
  Banknote,
  ArrowRightLeft,
  Home,
  Gift,
} from "lucide-react";
import styles from "./profile-dashboard.module.css";
import { getToken } from "@/utils/jwt";
import { EditCategoryModal } from "./EditCategoryModal";
import { RemoveCategoryModal } from "./RemoveCategoryModal";
import { AddCategoryModal } from './AddCategoryModal';
import { useSync } from '@/utils/sync';

export const ICON_MAP: Record<string, React.ElementType> = {
  food: ShoppingCart,
  transport: Car,
  shopping: Package,
  rent: Home,
  salary: Banknote,
  transfer: ArrowRightLeft,
  gift: Gift,
};

export type Category = {
  _id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  icon: string;
  isDefault: boolean;
};

async function fetchCategories(): Promise<Category[]> {
  try {
    const token = getToken();
    const res = await fetch("http://localhost:3333/api/categories", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.categories) ? data.categories : [];
  } catch {
    return [];
  }
}

export const ProfileDashboard = () => {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Для открытия/закрытия модалки редактирования
  const [editId, setEditId] = React.useState<string | null>(null);

  // Для открытия/закрытия модалки удаления
  const [removeCat, setRemoveCat] = React.useState<{ id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const { onPeerSync } = useSync();

  React.useEffect(() => {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  // Обновление категорий после редактирования/удаления
  const handleUpdated = () => {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    // Подпишемся только на события транзакций
    const unsubscribe = onPeerSync(
      (event) => event.type?.split(".")[0] === "category", // фильтр
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (event) => {
        fetchCategories();
        handleUpdated();
      }
    );
    return () => unsubscribe();
  }, [fetchCategories, handleUpdated, onPeerSync]);

  return (
    <div className={styles.profileRoot}>
      {/* Header */}
      <div className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Профиль</h1>
      </div>

      <div className={styles.profileGrid}>
        {/* Categories Section */}
        <Card className={styles.profileCard}>
          <h2 className={styles.profileCardTitle}>Категории</h2>
          <div className={styles.categoriesGrid}>
            {loading && <div style={{ color: "#9faacb", gridColumn: "span 2" }}>Загрузка…</div>}
            {!loading && categories.map((category) => {
              const Icon = ICON_MAP[category.icon] || ShoppingCart;
              return (
                <div key={category._id} className={styles.categoryRow}>
                  <div className={styles.categoryInfo}>
                    <Icon className={styles.categoryIcon} />
                    <span className={styles.categoryName}>{category.name}</span>
                  </div>
                  <div className={styles.iconActions}>
                    {!category.isDefault && (
                      <>
                        <span title="Редактировать">
                          <Edit className={styles.actionIcon} onClick={() => setEditId(category._id)} />
                        </span>
                        <span title="Удалить">
                          <X
                            className={styles.actionIcon}
                            onClick={() => setRemoveCat({ id: category._id, name: category.name })}
                          />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="ghost"
            className={styles.addCategoryBtn}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Добавить категорию</span>
          </Button>
          <AddCategoryModal
            open={addOpen}
            onOpenChange={setAddOpen}
            onAdded={handleUpdated}
            />
          <EditCategoryModal
            categoryId={editId}
            open={!!editId}
            onOpenChange={open => setEditId(open ? editId : null)}
            onUpdated={handleUpdated}
          />
          <RemoveCategoryModal
            open={!!removeCat}
            categoryName={removeCat?.name || ""}
            onConfirm={async () => {
              if (removeCat) {
                await deleteCategory(removeCat.id);
                setRemoveCat(null);
                handleUpdated();
              }
            }}
            onCancel={() => setRemoveCat(null)}
            loading={false}
          />
        </Card>
      </div>
    </div>
  );
};

async function deleteCategory(id: string) {
  const token = getToken();
  const res = await fetch(`http://localhost:3333/api/categories/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("Ошибка удаления");
}