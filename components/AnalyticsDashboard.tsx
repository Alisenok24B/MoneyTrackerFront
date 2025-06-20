/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  Plus,
  Wallet,
  ShoppingCart,
  ArrowRightLeft,
  CalendarIcon,
  ArrowLeft,
} from "lucide-react";
import { AddTransactionModal } from "./AddTransactionModal";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import styles from "./analytics.module.css";
import { APIAccount, BackendTransaction } from '@/lib/core.types';
import { getToken } from "@/utils/jwt";
import { useAccounts } from '@/utils/account';
import { TransactionDetailModal } from './TransactionDetailModal';
import { useSync } from '@/utils/sync';

function getDeterministicColor(categoryId: string, type: "income" | "expense") {
  // income – зеленый, expense – розовый, но детерминировано
  const base = type === "income" ? 180 : 0;
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) % 100000;
  }
  const hue = (base + (hash * 127) % 360) % 360;
  const sat = 70 + (hash % 25);
  const light = 52 + ((hash >> 2) % 20);
  return `hsl(${hue},${sat}%,${light}%)`;
}

type BreakdownItem = {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
};

type ChartPoint = { name: string; value: number; date: string; categoryId?: string; isZero?: boolean };

function getDateRange(from: Date, to: Date) {
  const days = [];
  let d = new Date(from);
  while (d <= to) {
    days.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  return days;
}

function getTickLabel(dateStr: string, allDates: string[]) {
  if (allDates.length === 0) return dateStr;
  const date = new Date(dateStr);
  const months = new Set(allDates.map(d => new Date(d).getMonth()));
  const years = new Set(allDates.map(d => new Date(d).getFullYear()));

  if (years.size > 1) {
    return format(date, "dd.MM.yyyy");
  }
  if (months.size === 1) {
    return format(date, "d");
  }
  return format(date, "dd MMMM", { locale: ru });
}

export const AnalyticsDashboard: React.FC = () => {
  const { accounts, reloadAccounts } = useAccounts();
  const { onPeerSync } = useSync();
  const params = useSearchParams();
  const type = params.get('type') === 'income' ? 'income' : 'expense';

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
//   const [accounts, setAccounts] = useState<APIAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<BackendTransaction[]>([]);
  const [summary, setSummary] = useState<{ total: number; breakdown: BreakdownItem[] }>({ total: 0, breakdown: [] });
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [txDetailId, setTxDetailId] = useState<string | null>(null);

  // Pagination
  const pageSize = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const pagesCount = Math.ceil(transactions.length / pageSize);
  const sortedTransactions = useMemo(
    () => transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );
  const pagedTransactions = useMemo(
    () => sortedTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedTransactions, currentPage]
  );

  // Хук обновления транзакций
  const fetchTransactions = React.useCallback(() => {
    const token = getToken();
    const paramsUrl = new URLSearchParams();
    paramsUrl.set("type", type);

    const { from, to } = getActiveDateRange();
    if (from) paramsUrl.append("from", format(from, "yyyy-MM-dd"));
    if (to) paramsUrl.append("to", format(to, "yyyy-MM-dd"));
    if (selectedAccounts.length)
      selectedAccounts.forEach((id) => paramsUrl.append("accountIds[]", id));

    fetch(`http://localhost:3333/api/transactions?${paramsUrl.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (res.status === 401) return { transactions: [] };
        return res.json();
      })
      .then((data: { transactions?: BackendTransaction[] }) => {
        setTransactions(data.transactions ?? []);
        setCurrentPage(1);
      })
      .catch(() => {
        setTransactions([]);
        setCurrentPage(1);
      });
  }, [dateRange, selectedAccounts, type]);

    useEffect(() => {
        if (accounts.length && selectedAccounts.length === 0) {
            setSelectedAccounts(accounts.map(a => a._id));
        }
    }, [accounts]);

  const getActiveDateRange = () => {
    if (dateRange?.from && dateRange?.to) return { from: dateRange.from, to: dateRange.to };
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  };

  // TRANSACTIONS (filtered)
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  React.useEffect(() => {
    // Подпишемся только на account-события
    const unsubscribe = onPeerSync(
        (event) => ["account", "user", "transaction"].includes(event.type?.split(".")[0]),
        (event) => {
        // Можно залогировать событие если хочешь:
        // console.log("Account event:", event);
        fetchTransactions();
        reloadAccounts();
        }
    );
    return () => unsubscribe();
    }, [fetchTransactions, reloadAccounts, onPeerSync]);

  // SUMMARY (pie)
  useEffect(() => {
    const token = getToken();
    const { from, to } = getActiveDateRange();
    const body = {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      accountIds: selectedAccounts.length ? selectedAccounts : undefined,
      type,
    };
    fetch("http://localhost:3333/api/transactions/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => res.json())
      .then((data: { total: number; breakdown: BreakdownItem[] }) => {
        setSummary({
          total: data.total ?? 0,
          breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
        });
      })
      .catch(() => setSummary({ total: 0, breakdown: [] }));
  }, [dateRange, selectedAccounts, type]);

  // CHART (bar, динамика)
  useEffect(() => {
    const { from, to } = getActiveDateRange();
    const allDates = getDateRange(from, to);
    const dayMap = new Map<string, number>();
    transactions.forEach((tx) => {
      const key = format(new Date(tx.date), "yyyy-MM-dd");
      dayMap.set(key, (dayMap.get(key) ?? 0) + tx.amount);
    });
    let prevTotal = 0;
    const points: ChartPoint[] = allDates.map((date, idx) => {
      const total = dayMap.has(date) ? dayMap.get(date)! : prevTotal;
      if (dayMap.has(date)) prevTotal = total;
      return {
        name: getTickLabel(date, allDates),
        value: Math.abs(dayMap.get(date) ?? 0),
        total,
        date,
        isZero: (dayMap.get(date) ?? 0) === 0,
      };
    });
    setChartData(points);
  }, [transactions, dateRange]);

  // PIE DATA с минимальным сектором
  const pieData = useMemo(() => {
    const minPercent = 0.01; // 1% min sector
    if (!summary.breakdown.length) return [];
    const total = summary.breakdown.reduce((sum, b) => sum + Math.abs(b.amount), 0);
    let adjusted = summary.breakdown.map((b) => ({
      ...b,
      value: Math.abs(b.amount),
      color: getDeterministicColor(b.categoryId, type),
      initialPercent: Math.abs(b.amount) / (total || 1),
    }));
    const toBoost = adjusted.filter(b => b.initialPercent < minPercent);
    const boostTotal = toBoost.length * minPercent * total - toBoost.reduce((sum, b) => sum + b.value, 0);
    if (toBoost.length && boostTotal > 0) {
      adjusted = adjusted.map((b) =>
        b.initialPercent < minPercent
          ? { ...b, value: minPercent * total }
          : b
      );
      const bigs = adjusted.filter(b => b.initialPercent >= minPercent);
      const bigsSum = bigs.reduce((sum, b) => sum + b.value, 0);
      const leftForBigs = total - toBoost.length * minPercent * total;
      adjusted = adjusted.map((b) =>
        b.initialPercent >= minPercent
          ? { ...b, value: (b.value / bigsSum) * leftForBigs }
          : b
      );
    }
    return adjusted.map((b) => ({
      name: b.name,
      value: b.value,
      color: b.color,
    }));
  }, [summary.breakdown, type]);

  const total = summary.total;

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className={styles.tooltipCard}>
          <div className={styles.tooltipDate}>{name}</div>
          <div className={styles.tooltipAmount}>{value.toLocaleString("ru-RU")} ₽</div>
        </div>
      );
    }
    return null;
  };

  function getTransactionInfo(transaction: BackendTransaction) {
    const dateStr = format(new Date(transaction.date), "d MMMM", { locale: ru });
    if (transaction.type === "income" || transaction.type === "expense") {
      let right = "";
      if (transaction.account?.name) right += transaction.account.name;
      if (transaction.account?.owner?.name) right += ` (${transaction.account.owner.name})`;
      return `${right ? right + " • " : ""}${dateStr}`;
    }
    if (transaction.type === "transfer") {
      const from = [
        transaction.fromAccount?.name,
        transaction.fromAccount?.owner?.name ? `(${transaction.fromAccount.owner.name})` : null
      ].filter(Boolean).join(" ");
      const to = [
        transaction.toAccount?.name,
        transaction.toAccount?.owner?.name ? `(${transaction.toAccount.owner.name})` : null
      ].filter(Boolean).join(" ");
      return `${from} → ${to} • ${dateStr}`;
    }
    return dateStr;
  }

  // --- Хук: глобальный reloadSidebarAccounts ---
  useEffect(() => {
    window.reloadSidebarAccounts = window.reloadSidebarAccounts || (() => {});
    return () => {
      // Не снимаем здесь подписку, чтобы Sidebar мог перехватывать глобально
    };
  }, []);

  return (
    <div className={styles.analyticsRoot}>
      {/* Header */}
      <div className={styles.analyticsHeader}>
        <div className={styles.headerLeft}>
          <Link href="/">
            <Button variant="ghost" size="sm" className={styles.backBtn}>
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          </Link>
          <h1 className={styles.analyticsTitle}>Аналитика</h1>
        </div>
        <button className={styles.addOperationBtn} onClick={() => setIsAddTransactionOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить операцию
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        <div className={styles.dateRangeCard}>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                className={styles.dateRangeButton}
                aria-label="Выбрать период"
                onClick={() => setCalendarOpen(true)}
              >
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd.MM.yyyy")} - {format(dateRange.to, "dd.MM.yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd.MM.yyyy")
                  )
                ) : (
                  "Выберите период"
                )}
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className={styles.filterCalendarCard}>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  defaultMonth={dateRange?.from}
                  numberOfMonths={2}
                  onSelect={setDateRange}
                  showOutsideDays
                />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateRange(undefined);
                      setCalendarOpen(false);
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className={styles.accountsCard}>
          <Select>
            <SelectTrigger className="selectTrigger">
              <span className={styles.accountsCardText}>
                {selectedAccounts.length === accounts.length
                  ? "Выбраны все счета"
                  : selectedAccounts.length === 0
                  ? "Выберите счета"
                  : `Выбрано: ${selectedAccounts.length}`}
              </span>
            </SelectTrigger>
            <SelectContent className="selectContent">
              {accounts.map((account) => (
                <div key={account._id} className="flex items-center space-x-2 px-2 py-1.5">
                  <Checkbox
                    id={account._id}
                    checked={selectedAccounts.includes(account._id)}
                    onCheckedChange={() => toggleAccount(account._id)}
                  />
                  <label htmlFor={account._id} className="text-sm cursor-pointer">
                    {account.name}
                  </label>
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pie & Bar Charts */}
      <div className={styles.pieBlock}>
        <Card style={{ flex: 1 }} className={styles.chartCard}>
          <CardHeader>
            <CardTitle className={`text-2xl`}>
              {type === 'income' ? 'Доходы' : 'Расходы'} – {total.toLocaleString("ru-RU")} ₽
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.pieBlock}>
              <div className={styles.pieWrapperWithFlex}>
                <ResponsiveContainer width="100%" height={256}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((i, idx) => (
                        <Cell key={idx} fill={i.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.pieLegendVertical}>
                {pieData.map((i, idx) => (
                  <div key={idx} className={styles.pieLegendRow}>
                    <div className={styles.pieLegendColor} style={{ backgroundColor: i.color }} />
                    <span className={styles.pieLegendText}>{i.name}</span>
                    <span className={styles.pieLegendAmount}>
                      {i.value.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card style={{ flex: 1 }} className={styles.chartCard}>
  <CardHeader>
    <CardTitle>Динамика за период</CardTitle>
  </CardHeader>
  <CardContent>
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 14, right: 18, left: 12, bottom: 14 }}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fontWeight: 500 }}
            allowDecimals={false}
          />
          <RechartsTooltip content={CustomTooltip} cursor={{ fill: 'rgba(54,160,255,0.12)' }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} minPointSize={2} isAnimationActive={true}>
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isZero ? "#cbd5e1" : "#0ea5e9"}
                className="barRect"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
      </div>

      {/* Transactions */}
      <Card className={styles.transactionListCard}>
        <CardHeader>
          <CardTitle>Последние операции</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pagedTransactions.length === 0 ? (
            <div className={styles.transactionCardRow} style={{ opacity: 0.7 }}>
              Нет операций за выбранный период
            </div>
          ) : (
            pagedTransactions.map((transaction) => (
              <div key={transaction._id}>
                <div
                    className={styles.transactionCardRow}
                    style={{ cursor: "pointer" }}
                    onClick={() => setTxDetailId(transaction._id)}
                    >
                  <div className="flex items-center gap-3">
                    <div className={styles.transactionIconWrapper}>
                      {transaction.type === "income" && <Wallet className="h-4 w-4" />}
                      {transaction.type === "expense" && <ShoppingCart className="h-4 w-4" />}
                      {transaction.type === "transfer" && <ArrowRightLeft className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={styles.transactionTitle}>
                        {transaction.category?.name || "Операция"}
                      </p>
                      <p className={styles.transactionSubtitle}>
                        {transaction.description || ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={[
                        styles.transactionAmount,
                        transaction.type === "income"
                          ? styles.income
                          : transaction.type === "expense"
                          ? styles.expense
                          : styles.transfer,
                      ].join(" ")}
                    >
                      {transaction.type === "income"
                        ? "+"
                        : transaction.type === "expense"
                        ? "-"
                        : ""}
                      {Math.abs(transaction.amount).toLocaleString("ru-RU")} ₽
                    </p>
                    <p className={styles.transactionMeta}>
                      {getTransactionInfo(transaction)}
                    </p>
                  </div>
                </div>
                <Separator className={styles.separatorRow} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TransactionDetailModal
        open={!!txDetailId}
        onOpenChange={() => setTxDetailId(null)}
        transactionId={txDetailId}
        onDeleted={() => {
            fetchTransactions();
            reloadAccounts();
          }}
        />

      {/* Пагинация */}
      {pagesCount > 1 && (
        <div className={styles.paginationWrapper}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={styles.paginationBtn}
          >
            Назад
          </Button>
          <span className={styles.paginationInfo}>
            {currentPage} / {pagesCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pagesCount, p + 1))}
            disabled={currentPage === pagesCount}
            className={styles.paginationBtn}
          >
            Вперёд
          </Button>
        </div>
      )}

      <AddTransactionModal
        open={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
        onTransactionAdded={() => {
          fetchTransactions();
          reloadAccounts();
        }}
      />
    </div>
  );
};