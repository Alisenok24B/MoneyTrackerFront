/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import styles from "./TransactionDetailModal.module.css";
import { Wallet, ShoppingCart, ArrowRightLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { getToken } from "@/utils/jwt";

type TransactionType = "income" | "expense" | "transfer";

interface TransactionOwner {
  id: string;
  name: string;
}

interface TransactionCategory {
  id: string;
  name: string;
}

interface TransactionAccount {
  name: string;
  type: string;
  owner?: TransactionOwner;
}

interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  hasInterest: boolean;
  category?: TransactionCategory;
  fromAccount?: TransactionAccount;
  toAccount?: TransactionAccount;
  account?: TransactionAccount;
}

interface TransactionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  onDeleted?: () => void;
}

// Типы транзакций на русском
const typeLabel: Record<TransactionType, string> = {
  income: "Доход",
  expense: "Расход",
  transfer: "Перевод",
};

function accountTypeLabel(type: string) {
  if (type === "debit") return "Дебетовая карта";
  if (type === "creditCard") return "Кредитная карта";
  if (type === "cash") return "Наличные";
  if (type === "savings") return "Сберегательный счёт";
  return type;
}

function typeIcon(type: TransactionType) {
  if (type === "income") return <Wallet className={styles.icon} />;
  if (type === "expense") return <ShoppingCart className={styles.icon} />;
  if (type === "transfer") return <ArrowRightLeft className={styles.icon} />;
  return null;
}

function formatDateRus(dateStr: string) {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: ru });
  } catch {
    return dateStr;
  }
}

export const TransactionDetailModal = ({
  open,
  onOpenChange,
  transactionId,
  onDeleted
}: TransactionDetailModalProps) => {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && transactionId) {
      setLoading(true);
      setErr(null);
      const token = getToken();
      fetch(`http://localhost:3333/api/transactions/${transactionId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Ошибка при загрузке транзакции");
          return res.json();
        })
        .then((data) => setTx(data.transaction || data))
        .catch(() => setErr("Ошибка при загрузке транзакции"))
        .finally(() => setLoading(false));
    } else if (!open) {
      setTx(null);
      setErr(null);
      setDeleteErr(null);
    }
  }, [open, transactionId]);

  // Удаление транзакции
  const handleDelete = async () => {
    if (!tx?._id) return;
    setDeleteLoading(true);
    setDeleteErr(null);
    const token = getToken();
    try {
      const res = await fetch(
        `http://localhost:3333/api/transactions/${tx._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error("Ошибка при удалении");
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (e) {
      setDeleteErr("Ошибка при удалении");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={styles.modalContent}
        aria-describedby={tx?.description ? "transaction-desc" : undefined}
        style={{ border: "none" }}
      >
        <DialogHeader>
          <DialogTitle>
            {loading
              ? "Загрузка..."
              : err
              ? "Ошибка"
              : tx
              ? typeLabel[tx.type]
              : ""}
          </DialogTitle>
        </DialogHeader>
        {loading && <div style={{ minHeight: 60 }} />}
        {err && <div className="text-red-600">{err}</div>}
        {tx && !loading && (
          <div className={styles.detailBody}>
            {/* Icon, type, amount */}
            <div className={styles.rowTop}>
              <span className={styles.iconWrap}>{typeIcon(tx.type)}</span>
              <span
                className={[
                  styles.amount,
                  tx.type === "income"
                    ? styles.income
                    : tx.type === "expense"
                    ? styles.expense
                    : styles.transfer,
                ].join(" ")}
              >
                {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                {Math.abs(tx.amount).toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div className={styles.metaRow}>
              <span>Дата</span>
              <span>{formatDateRus(tx.date)}</span>
            </div>
            {tx.category?.name && (
              <div className={styles.metaRow}>
                <span>Категория</span>
                <span>{tx.category.name}</span>
              </div>
            )}
            {tx.type === "transfer" && (
              <div className={styles.transferBlock}>
                <div className={styles.metaRow}>
                  <span>Счёт списания</span>
                  <span>
                    {tx.fromAccount?.name}
                    {tx.fromAccount?.type && (
                      <span className={styles.accountType}>
                        {" "}
                        ({accountTypeLabel(tx.fromAccount.type)})
                      </span>
                    )}
                    {tx.fromAccount?.owner?.name && (
                      <span className={styles.ownerLabel}>
                        {" "}
                        • {tx.fromAccount.owner.name}
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.transferArrow}>→</div>
                <div className={styles.metaRow}>
                  <span>Счёт зачисления</span>
                  <span>
                    {tx.toAccount?.name}
                    {tx.toAccount?.type && (
                      <span className={styles.accountType}>
                        {" "}
                        ({accountTypeLabel(tx.toAccount.type)})
                      </span>
                    )}
                    {tx.toAccount?.owner?.name && (
                      <span className={styles.ownerLabel}>
                        {" "}
                        • {tx.toAccount.owner.name}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
            {(tx.type === "income" || tx.type === "expense") && tx.account && (
              <div className={styles.metaRow}>
                <span>Счёт</span>
                <span>
                  {tx.account.name}
                  {tx.account.type && (
                    <span className={styles.accountType}>
                      {" "}
                      ({accountTypeLabel(tx.account.type)})
                    </span>
                  )}
                  {tx.account.owner?.name && (
                    <span className={styles.ownerLabel}>
                      {" "}
                      • {tx.account.owner.name}
                    </span>
                  )}
                </span>
              </div>
            )}
            {tx.description && (
              <div className={styles.metaRow}>
                <span>Описание</span>
                <span id="transaction-desc">{tx.description}</span>
              </div>
            )}
            {tx.hasInterest && (
              <div className={styles.metaRow}>
                <span>Погашение процентов</span>
                <span>Да</span>
              </div>
            )}
          </div>
        )}
        <Separator className={styles.sep} />
        <DialogFooter className={styles.footer}>
          {tx && (
            <Button
              className={styles.dangerBtn}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Удаление..." : "Удалить"}
            </Button>
          )}
          <Button 
          className={styles.editBtn}
          onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
        {deleteErr && (
          <div className="text-red-500 mt-1" style={{ marginTop: 6 }}>
            {deleteErr}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};