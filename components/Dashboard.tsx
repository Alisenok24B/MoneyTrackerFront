/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Plus, Wallet, ShoppingCart, ArrowRightLeft, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { AddTransactionModal } from './AddTransactionModal';
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import Link from 'next/link';
import styles from "./dashboard.module.css";
import { APIAccount, BackendTransaction } from '@/lib/core.types';
import React from 'react';
import { getToken } from '@/utils/jwt';
import { TransactionDetailModal } from './TransactionDetailModal';
import { useAccounts } from '@/utils/account';
import { useSync } from '@/utils/sync';

declare global {
    interface Window {
      reloadSidebarAccounts?: () => void;
    }
  }

function getDeterministicColor(categoryId: string, type: "income" | "expense") {
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
  const date = parseISO(dateStr);
  const months = new Set(allDates.map(d => parseISO(d).getMonth()));
  const years = new Set(allDates.map(d => parseISO(d).getFullYear()));

  if (years.size > 1) {
    return format(date, "dd.MM.yyyy");
  }
  if (months.size === 1) {
    return format(date, "d");
  }
  return format(date, "dd MMMM", { locale: ru });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.total ?? 0;
    const amount = data.value ?? 0;

    let deltaText, deltaClass;
    if (amount > 0) {
      deltaText = `+${amount.toLocaleString('ru-RU')} ₽`;
      deltaClass = styles.tooltipDeltaPositive;
    } else if (amount < 0) {
      deltaText = `-${Math.abs(amount).toLocaleString('ru-RU')} ₽`;
      deltaClass = styles.tooltipDeltaNegative;
    } else {
      deltaText = '0 ₽';
      deltaClass = styles.tooltipDeltaZero;
    }

    return (
      <div className={styles.tooltipCard}>
        <div className={styles.tooltipDate}>{data.date}</div>
        <div className={styles.tooltipAmount}>{total.toLocaleString('ru-RU')} ₽</div>
        <div className={deltaClass}>{deltaText}</div>
      </div>
    );
  }
  return null;
};

type BreakdownItem = {
  categoryId: string;
  name: string;
  amount: number;
  percent: number;
};

export const Dashboard = () => {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accounts, setAccounts] = useState<APIAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<BackendTransaction[]>([]);
  const [chartData, setChartData] = useState<
    { name: string; value: number; total: number; date: string; isZero?: boolean }[]
  >([]);
  const [summaryExpense, setSummaryExpense] = useState<{ total: number, breakdown: BreakdownItem[] }>({ total: 0, breakdown: [] });
  const [summaryIncome, setSummaryIncome] = useState<{ total: number, breakdown: BreakdownItem[] }>({ total: 0, breakdown: [] });
  const [txDetailId, setTxDetailId] = useState<string | null>(null);

  const { reloadAccounts } = useAccounts();
  const { onPeerSync } = useSync();
  const pageSize = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const pagesCount = Math.ceil(transactions.length / pageSize);

  const getActiveDateRange = () => {
    if (dateRange?.from && dateRange?.to) return { from: dateRange.from, to: dateRange.to };
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  };

  React.useEffect(() => {
    const token = getToken();
    fetch("/api/accounts", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          console.warn("Unauthorized fetching accounts");
          return { accounts: [] };
        }
        return res.json();
      })
      .then((data: { accounts?: APIAccount[] }) => {
        setAccounts(data.accounts ?? []);
        setSelectedAccounts(data.accounts?.map((a) => a._id) ?? []);
      })
      .catch((err) => {
        console.error("Error loading accounts:", err);
        setAccounts([]);
        setSelectedAccounts([]);
      });
  }, []);

  React.useEffect(() => {
    const token = getToken();
    const params = new URLSearchParams();
    const { from, to } = getActiveDateRange();
    if (from) params.append("from", format(from, "yyyy-MM-dd"));
    if (to) params.append("to", format(to, "yyyy-MM-dd"));
    if (selectedAccounts.length)
      selectedAccounts.forEach((id) => params.append("accountIds[]", id));

    fetch(`http://localhost:3333/api/transactions?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          console.warn("Unauthorized fetching transactions");
          return { transactions: [] };
        }
        return res.json();
      })
      .then((data: { transactions?: BackendTransaction[] }) => {
        setTransactions(data.transactions ?? []);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error loading transactions:", err);
        setTransactions([]);
        setCurrentPage(1);
      });
  }, [dateRange, selectedAccounts]);

  React.useEffect(() => {
    const token = getToken();
    if (!selectedAccounts.length) {
      setChartData([]);
      return;
    }
    const body: any = { accountIds: selectedAccounts };
    const { from, to } = getActiveDateRange();
    if (dateRange?.from && dateRange?.to) {
      body.dates = [
        format(from, "yyyy-MM-dd"),
        format(to, "yyyy-MM-dd"),
      ];
    }
    fetch("http://localhost:3333/api/accounts/balance-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch balance history");
        return res.json();
      })
      .then((data: { history?: { date: string; total: number }[] }) => {
        if (!data.history || !from || !to) {
          setChartData([]);
          return;
        }
        const allDates = getDateRange(from, to);

        const historyMap = new Map<string, number>();
        data.history.forEach(item => historyMap.set(item.date, item.total));

        let prevTotal: number | undefined = undefined;
        const fullHistory = allDates.map(date => {
          let total = prevTotal ?? 0;
          if (historyMap.has(date)) {
            total = historyMap.get(date)!;
            prevTotal = total;
          }
          return { date, total };
        });

        const chart = fullHistory.map((item, i) => {
          let delta = 0;
          if (i === 0) {
            delta = 0;
          } else {
            delta = item.total - fullHistory[i - 1].total;
          }
          return {
            name: getTickLabel(item.date, allDates),
            value: delta,
            total: item.total,
            date: item.date,
            isZero: item.total === 0
          };
        });

        setChartData(chart);
      })
      .catch((err) => {
        console.error("Error loading chart data:", err);
        setChartData([]);
      });
  }, [selectedAccounts, dateRange]);

  React.useEffect(() => {
    const token = getToken();
    const { from, to } = getActiveDateRange();
    const baseBody = {
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
      accountIds: selectedAccounts.length ? selectedAccounts : undefined,
    };

    // Expenses
    fetch("http://localhost:3333/api/transactions/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...baseBody, type: "expense" }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch expense summary");
        return res.json();
      })
      .then((data: { total: number, breakdown: BreakdownItem[] }) => {
        setSummaryExpense({
          total: data.total ?? 0,
          breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
        });
      })
      .catch(() => setSummaryExpense({ total: 0, breakdown: [] }));

    // Incomes
    fetch("http://localhost:3333/api/transactions/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...baseBody, type: "income" }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch income summary");
        return res.json();
      })
      .then((data: { total: number, breakdown: BreakdownItem[] }) => {
        setSummaryIncome({
          total: data.total ?? 0,
          breakdown: Array.isArray(data.breakdown) ? data.breakdown : [],
        });
      })
      .catch(() => setSummaryIncome({ total: 0, breakdown: [] }));
  }, [dateRange, selectedAccounts]);

  const sortedTransactions = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pagedTransactions = sortedTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderSummaryCard = (
    type: "expense" | "income",
    summary: { total: number; breakdown: BreakdownItem[] },
    href: string
  ) => {
    const sortedBreakdown = [...summary.breakdown].sort((a, b) => b.amount - a.amount);
    return (
      <Link
        href={href}
        className={styles.analyticsLink}
        tabIndex={-1}
        style={{ textDecoration: "none" }}
      >
        <div className={`${styles.summaryCard} ${type === "expense" ? styles.expense : styles.income}`}>
          <div className={styles.summaryAmount}>
            {summary.total.toLocaleString('ru-RU')} ₽
          </div>
          <div className={styles.summaryLabel}>
            {type === "income" ? "Доходы" : "Расходы"}
          </div>
          <div className={styles.summaryBar}>
            {sortedBreakdown.length === 0 ? (
              <div style={{ background: "#263e78", flex: 1 }} />
            ) : (
              sortedBreakdown.map((b, idx) => (
                <div
                  key={b.categoryId}
                  style={{
                    background: getDeterministicColor(b.categoryId, type),
                    flex: b.percent > 0 ? b.percent : 0.01,
                    minWidth: b.percent > 0 ? undefined : 2,
                    borderRadius:
                      idx === 0 && sortedBreakdown.length === 1
                        ? "999px"
                        : idx === 0
                        ? "999px 0 0 999px"
                        : idx === sortedBreakdown.length - 1
                        ? "0 999px 999px 0"
                        : undefined,
                  }}
                  title={`${b.name}: ${b.amount.toLocaleString('ru-RU')} ₽ (${b.percent}%)`}
                ></div>
              ))
            )}
          </div>
        </div>
      </Link>
    );
  };

  React.useEffect(() => {
    window.reloadSidebarAccounts = () => {
      // Можно просто "передёрнуть" useEffect в Sidebar — вызывается reloadAccounts()
      // Но тут не надо ничего, просто объявляем
    };
    return () => {
      // При размонтировании убираем (не обязательно, но аккуратно)
      delete window.reloadSidebarAccounts;
    };
  }, []);

  const fetchTransactions = React.useCallback(() => {
    const token = getToken();
    const params = new URLSearchParams();
    const { from, to } = getActiveDateRange();
    if (from) params.append("from", format(from, "yyyy-MM-dd"));
    if (to) params.append("to", format(to, "yyyy-MM-dd"));
    if (selectedAccounts.length)
      selectedAccounts.forEach((id) => params.append("accountIds[]", id));
  
    fetch(`http://localhost:3333/api/transactions?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          console.warn("Unauthorized fetching transactions");
          return { transactions: [] };
        }
        return res.json();
      })
      .then((data: { transactions?: BackendTransaction[] }) => {
        setTransactions(data.transactions ?? []);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error loading transactions:", err);
        setTransactions([]);
        setCurrentPage(1);
      });
  }, [dateRange, selectedAccounts]);

  React.useEffect(() => {
    // Подпишемся только на события транзакций
    const unsubscribe = onPeerSync(
      (event) => event.type?.split(".")[0] === "transaction", // фильтр
      (event) => {
        fetchTransactions();
        reloadAccounts();
      }
    );
    return () => unsubscribe();
  }, [fetchTransactions, reloadAccounts, onPeerSync]);

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

  return (
    <div className={styles.dashboardRoot}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Дашборд</h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.addOperationBtn} onClick={() => setIsAddTransactionOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить операцию
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterRow}>
        {/* Date Range Picker */}
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

        {/* Accounts Multi-Select */}
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
                    onCheckedChange={() =>
                      setSelectedAccounts((prev) =>
                        prev.includes(account._id)
                          ? prev.filter((id) => id !== account._id)
                          : [...prev, account._id]
                      )
                    }
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

      {/* Chart */}
      <Card className={styles.chartCard}>
  <CardContent className={styles.chartWrapper}>
    <ResponsiveContainer width="100%" height="100%">
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
        <Tooltip
          content={CustomTooltip}
          cursor={{ fill: 'rgba(54,160,255,0.12)' }}
        />
        <Bar dataKey="total" radius={[5, 5, 0, 0]} minPointSize={2} isAnimationActive={true}>
        {chartData.map((entry, idx) => (
            <Cell
            key={idx}
            fill={entry.isZero ? "#cbd5e1" : "#0ea5e9"}
            className="barRect"
            />
        ))}
        </Bar>
        <defs>
          <linearGradient id="barGrad0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#42c3ff"/>
            <stop offset="100%" stopColor="#1a48b8"/>
          </linearGradient>
          <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff93e2"/>
            <stop offset="100%" stopColor="#ba6aff"/>
          </linearGradient>
          <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#79f0a2"/>
            <stop offset="100%" stopColor="#0db48b"/>
          </linearGradient>
          <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe78a"/>
            <stop offset="100%" stopColor="#faad3c"/>
          </linearGradient>
          <linearGradient id="barBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cad3e7"/>
            <stop offset="100%" stopColor="#eaf2fe"/>
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>

      {/* Income/Expense Cards */}
      <div className={styles.incomeExpenseGrid}>
        {renderSummaryCard("expense", summaryExpense, { pathname: "/analytics", query: { type: "expense" } } as any)}
        {renderSummaryCard("income", summaryIncome, { pathname: "/analytics", query: { type: "income" } } as any)}
      </div>

      {/* Transactions */}
      <Card className={styles.transactionListCard}>
  <CardContent className="p-0">
    {pagedTransactions.length === 0 ? (
      <div className={styles.transactionCardRow} style={{ opacity: 0.7 }}>
        Нет операций за выбранный период
      </div>
    ) : (
      pagedTransactions.map((transaction) => (
        <div key={transaction._id}>
          <div className={styles.transactionCardRow}               
            style={{ cursor: "pointer" }}
              onClick={() => setTxDetailId(transaction._id)}>
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
            // Просто обновляем список операций после успешного добавления!
            fetchTransactions();
            reloadAccounts();
        }}
        />
    </div>
  );
};