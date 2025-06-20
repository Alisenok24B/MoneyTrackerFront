"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CreditCard, AlertTriangle } from "lucide-react";
import { getToken } from "@/utils/jwt";
import styles from "./SidebarUpcomingPayments.module.css";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type Owner = { id: string; name: string };

type Payment = {
  accountId: string;
  accountName: string;
  accountType: string;
  periodId: string;
  status: "payment" | "overdue";
  paymentDue: string;
  debt: number;
  owner?: Owner;
};

function statusLabel(status: string) {
  if (status === "payment") return "Ожидает оплаты";
  if (status === "overdue") return "Платеж просрочен";
  return status;
}

function formatDue(date: string) {
  // "до 30 июля 2025"
  const parsed = parseISO(date);
  return (
    "до " +
    format(parsed, "d MMMM yyyy", { locale: ru })
      .replace(/ г\.$/, "")
  );
}

async function fetchUpcomingPayments(): Promise<Payment[]> {
  try {
    const token = getToken();
    const res = await fetch("http://localhost:3333/api/accounts/upcoming-payments", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.payments) ? data.payments : [];
  } catch {
    return [];
  }
}

export function SidebarUpcomingPayments() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [index, setIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchUpcomingPayments()
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className={styles.block}>
        <div className={styles.title}>Предстоящие платежи</div>
        <div className={styles.loading}>Загрузка…</div>
      </section>
    );
  }

  if (!payments.length) {
    return null;
  }

  const payment = payments[index];

  function prev() {
    setIndex((prev) => (prev === 0 ? payments.length - 1 : prev - 1));
  }
  function next() {
    setIndex((prev) => (prev === payments.length - 1 ? 0 : prev + 1));
  }

  return (
    <section className={styles.block}>
      <div className={styles.title}>Предстоящие платежи</div>
      <div className={styles.content}>
        <button className={styles.arrow} onClick={prev} tabIndex={0} aria-label="Предыдущий">
          <ChevronLeft size={18} />
        </button>
        <div className={styles.cardWrapper}>
          <div className={styles.card + " " + (payment.status === "overdue" ? " " + styles.overdue : "")}>
            <div className={styles.cardHeader}>
              <CreditCard className={styles.iconCard} />
              <span className={styles.accountName}>{payment.accountName}</span>
              {payment.owner && (
                <span className={styles.accountOwner}>{payment.owner.name}</span>
              )}
            </div>
            <div className={styles.typeStatusRow}>
              <span className={styles.accountType}>
                {payment.accountType === "creditCard" ? "Кредитная карта" : payment.accountType}
              </span>
              <span className={styles.status + " " + (payment.status === "overdue" ? " " + styles.statusOverdue : "")}>
                {payment.status === "overdue" ? (
                  <AlertTriangle style={{ marginRight: 3, marginBottom: -2 }} size={13} />
                ) : null}
                {statusLabel(payment.status)}
              </span>
            </div>
            <div className={styles.paymentDue}>{formatDue(payment.paymentDue)}</div>
            <div className={styles.debt}>
            {payment.debt?.toLocaleString("ru-RU", {
                style: "currency",
                currency: "RUB",
                maximumFractionDigits: 0
            })}
            {payment.status === "overdue" && payment.debt === 0 && (
                <span className={styles.interestNote}> + начисленные %</span>
            )}
            </div>
          </div>
        </div>
        <button className={styles.arrow} onClick={next} tabIndex={0} aria-label="Следующий">
          <ChevronRight size={18} />
        </button>
      </div>
      {payments.length > 1 && (
        <div className={styles.pagination}>
          {payments.map((_, i) => (
            <span
              key={i}
              className={i === index ? styles.dotActive : styles.dot}
              onClick={() => setIndex(i)}
              tabIndex={0}
            />
          ))}
        </div>
      )}
    </section>
  );
}