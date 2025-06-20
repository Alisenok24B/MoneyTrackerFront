/* eslint-disable @typescript-eslint/no-unused-vars */
// components/Sidebar.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PieChart,
  User,
  CreditCard,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  LogOut,
  X,
} from "lucide-react";
import { AddAccountModal } from "./AddAccountModal";
import { AccountDetailModal } from "./AccountDetailModal";
import { RemovePeerModal } from "./RemovePeerModal";
import { APIAccount } from "@/lib/core.types";
import styles from "./Sidebar.module.css";
import { useAccounts } from "@/utils/account";
import { getToken } from "@/utils/jwt";
import { EditProfileModal } from './EditProfileModal';
import { AddPeerModal } from './AddPeerModal';
import { SidebarUpcomingPayments } from './SidebarUpcomingPayments';
import { SidebarNotificationsButton } from './SidebarNotificationsButton';
import { useSync } from '@/utils/sync';

// ===================
// --- PROFILE API ---
// ===================

interface UserProfile {
  email: string;
  displayName: string;
}

interface PeerUser {
  id: string;
  email: string;
  displayName: string;
}

async function fetchProfile(): Promise<UserProfile | null> {
  try {
    const token = getToken();
    const res = await fetch("http://localhost:3333/api/user/info", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.profile) return data.profile;
    return null;
  } catch {
    return null;
  }
}

async function fetchPeers(): Promise<PeerUser[]> {
  try {
    const token = getToken();
    const res = await fetch("http://localhost:3333/api/access/peers", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
  }).format(amount);
}

function isRootActive(pathname: string) {
  return (
    pathname === "/" ||
    (!pathname.startsWith("/profile") && pathname.startsWith("/"))
  );
}

export function Sidebar() {
  const { accounts, reloadAccounts, loading } = useAccounts();
  const pathname = usePathname();
  const router = useRouter();

  const { onPeerSync } = useSync();

    React.useEffect(() => {
    // Подпишемся только на account-события
    const unsubscribe = onPeerSync(
        (event) => event.type?.split(".")[0] === "account" || event.type?.split(".")[0] === "user",
        (event) => {
        // Можно залогировать событие если хочешь:
        // console.log("Account event:", event);
        reloadAccounts();
        }
    );
    return () => unsubscribe();
    }, [reloadAccounts, onPeerSync]);

  React.useEffect(() => {
    window.reloadSidebarAccounts = reloadAccounts;
    return () => {
      delete window.reloadSidebarAccounts;
    };
  }, [reloadAccounts]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <div className={styles.sidebarRoot}>
        <div className={styles.sidebarScroll}>
          <div className={styles.sidebarSection}>
            <p style={{ color: "#fff", opacity: 0.7 }}>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  if (pathname === "/profile") {
    return <ProfileSidebarContent onLogout={handleLogout} />;
  }
  return (
    <FinancialSidebarContent
      accounts={accounts}
      onLogout={handleLogout}
      reloadAccounts={reloadAccounts}
    />
  );
}

// --------------------
// -- Финансы Sidebar -
// --------------------

type FinancialProps = {
  accounts: APIAccount[];
  onLogout: () => void;
  reloadAccounts: () => void;
};

function FinancialSidebarContent({
  accounts,
  onLogout,
  reloadAccounts,
}: FinancialProps) {
  const getInitialExpanded = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sidebarExpanded");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return { debit: true, creditCard: false, cash: false };
  };
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(
    getInitialExpanded
  );
  const pathname = usePathname();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [detailAcct, setDetailAcct] = React.useState<APIAccount | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const byType = (t: APIAccount["type"]) => accounts.filter((a) => a.type === t);

  const sections = [
    { key: "debit", name: "Дебетовые карты", items: byType("debit") },
    { key: "creditCard", name: "Кредитные карты", items: byType("creditCard") },
    { key: "cash", name: "Наличные", items: byType("cash") },
  ];

  const totalAll = sections
    .flatMap((s) => s.items)
    .reduce((sum, a) => sum + a.balance, 0);

  React.useEffect(() => {
    localStorage.setItem("sidebarExpanded", JSON.stringify(expanded));
  }, [expanded]);

  return (
    <div className={styles.sidebarRoot}>
      <div className={styles.sidebarScroll}>
        {/* Навигация */}
        <nav className={`${styles.sidebarSection} ${styles.sidebarNav}`}>
          <Link href="/" className="block">
            <button
              className={[
                styles.sidebarNavItem,
                isRootActive(pathname) ? styles["sidebarNavItem--active"] : "",
              ].join(" ")}
            >
              <PieChart size={20} />
              <span>Дашборд</span>
            </button>
          </Link>
          <Link href="/profile" className="block">
            <button
              className={[
                styles.sidebarNavItem,
                pathname.startsWith("/profile")
                  ? styles["sidebarNavItem--active"]
                  : "",
              ].join(" ")}
            >
              <User size={20} />
              <span>Профиль</span>
            </button>
          </Link>
          <SidebarNotificationsButton />
          <button
            type="button"
            onClick={onLogout}
            className={styles.sidebarNavItem}
          >
            <LogOut size={20} />
            <span>Выход</span>
          </button>
        </nav>
        <hr className={styles.sidebarSeparator} />

        <SidebarUpcomingPayments />

        <hr className={styles.sidebarSeparator} />

        {/* Активы */}
        <section className={styles.sidebarSection}>
          <div className={styles.sidebarTotal}>
            <span className={styles.sidebarSectionTitle}>Активы</span>
            <span>{formatMoney(totalAll, "RUB")}</span>
          </div>
          <div className={styles.sidebarSectionAssets}>
            {sections.map((sec) => {
              const sum = sec.items.reduce((s, a) => s + a.balance, 0);
              return (
                <div key={sec.key} className={styles.sidebarAssetGroup}>
                  <button
                    className={styles.sidebarExpandBtn}
                    onClick={() =>
                      setExpanded((e) => ({
                        ...e,
                        [sec.key]: !e[sec.key],
                      }))
                    }
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {expanded[sec.key] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                      <span className={styles.sidebarAssetTitle}>{sec.name}</span>
                    </span>
                    <span style={{ opacity: 0.7 }}>
                      {formatMoney(sum, "RUB")}
                    </span>
                  </button>
                  {expanded[sec.key] && (
                    <div>
                      {sec.items.map((acct) => (
                        <div
                          key={acct._id}
                          className={`${styles.sidebarAccountItem} ${
                            detailAcct?._id === acct._id
                              ? styles.sidebarAccountSelected
                              : ""
                          }`}
                          onClick={() => {
                            setDetailAcct(acct);
                            setIsDetailOpen(true);
                          }}
                        >
                          <CreditCard size={16} />
                          {/* INFO и БАЛАНС: */}
                          <div className={styles.sidebarAccountInfo}>
                            <span className={styles.sidebarAccountName}>
                              {acct.name}
                            </span>
                            {acct.owner?.id && (
                              <span className={styles.sidebarAccountOwner}>
                                {acct.owner.name}
                              </span>
                            )}
                          </div>
                          <span className={styles.sidebarAccountBalance}>
                            {formatMoney(acct.balance, acct.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              className={styles.sidebarAddBtn}
              onClick={() => setIsAddOpen(true)}
            >
              <Plus size={17} />
              <span>Добавить счет</span>
            </button>
          </div>
        </section>
        <AddAccountModal
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onAccountAdded={reloadAccounts}
        />
        <AccountDetailModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          account={detailAcct}
          onDeleted={reloadAccounts}
          onEdited={reloadAccounts}
          canEdit={!detailAcct?.owner}
        />
      </div>
    </div>
  );
}

// --------------------
// -- Профиль Sidebar -
// --------------------

type ProfileProps = {
  onLogout: () => void;
};

function ProfileSidebarContent({ onLogout }: ProfileProps) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const pathname = usePathname();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [removePeerOpen, setRemovePeerOpen] = React.useState(false);
  const [peerToRemove, setPeerToRemove] = React.useState<{ id: string; name: string } | null>(null);

  // ---- Новое: peers (совместный доступ) ----
  const [peers, setPeers] = React.useState<PeerUser[]>([]);
  const [peersLoading, setPeersLoading] = React.useState(true);
  const [addPeerOpen, setAddPeerOpen] = React.useState(false);

  const { onPeerSync } = useSync();

  const { reloadAccounts, accounts } = useAccounts();

  React.useEffect(() => {
    window.reloadSidebarAccounts = () => {
      reloadAccounts();
      setTimeout(() => {
        // accounts может быть еще не обновлен, если асинхронно
        console.log("Accounts after reload:", accounts);
      }, 200);
    };
    return () => {
      delete window.reloadSidebarAccounts;
    };
  }, [reloadAccounts, accounts]);

  // Фетч профиля
  const refetchProfile = React.useCallback(() => {
    setProfileLoading(true);
    fetchProfile()
      .then((data) => setProfile(data))
      .finally(() => setProfileLoading(false));
  }, []);

  // Фетч пользователей совместного доступа
  const refetchPeers = React.useCallback(() => {
    setPeersLoading(true);
    fetchPeers()
      .then((data) => setPeers(data))
      .finally(() => setPeersLoading(false));
  }, []);

  React.useEffect(() => {
      // Подпишемся только на события транзакций
      const unsubscribe = onPeerSync(
        (event) => event.type?.split(".")[0] === "user", // фильтр
        (event) => {
          refetchPeers();
          fetchProfile();
          reloadAccounts();
        }
      );
      return () => unsubscribe();
    }, [refetchPeers, reloadAccounts, onPeerSync]);

  const openRemovePeer = (peer: PeerUser) => {
    setPeerToRemove({ id: peer.id, name: peer.displayName });
    setRemovePeerOpen(true);
  };

  React.useEffect(() => {
    refetchProfile();
    refetchPeers();
  }, [refetchProfile, refetchPeers]);

  return (
    <div className={styles.sidebarRoot}>
      <div className={styles.sidebarScroll}>
        {/* Навигация */}
        <nav className={`${styles.sidebarSection} ${styles.sidebarNav}`}>
          <Link href="/" className="block">
            <button
              className={[
                styles.sidebarNavItem,
                isRootActive(pathname) ? styles["sidebarNavItem--active"] : "",
              ].join(" ")}
            >
              <PieChart size={20} />
              <span>Дашборд</span>
            </button>
          </Link>
          <Link href="/profile" className="block">
            <button
              className={[
                styles.sidebarNavItem,
                pathname.startsWith("/profile")
                  ? styles["sidebarNavItem--active"]
                  : "",
              ].join(" ")}
            >
              <User size={20} />
              <span>Профиль</span>
            </button>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className={styles.sidebarNavItem}
          >
            <LogOut size={20} />
            <span>Выход</span>
          </button>
        </nav>
        <hr className={styles.sidebarSeparator} />

        {/* Profile Info */}
        <section className={styles.sidebarSection}>
          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarProfileName}>
              {profileLoading ? "Загрузка…" : profile?.displayName || "Пользователь"}
            </div>
            <div className={styles.sidebarProfileTag}>
              {profileLoading ? "" : profile?.email || ""}
            </div>
            <Edit
              size={16}
              style={{
                opacity: 0.6,
                marginTop: 2,
                cursor: "pointer",
              }}
              onClick={() => setEditOpen(true)}
            />
          </div>
        </section>
        <EditProfileModal
          open={editOpen}
          initialDisplayName={profile?.displayName}
          onOpenChange={setEditOpen}
          onChanged={() => refetchProfile()}
        />
        <hr className={styles.sidebarSeparator} />

        {/* Shared Access */}
        <section className={styles.sidebarSection}>
          <div className={styles.sidebarSharedAccess}>
            <div className={styles.sidebarSectionTitle}>Совместный доступ</div>
            <div>
              {peersLoading && <div style={{ color: "#9faacb", marginBottom: 7 }}>Загрузка…</div>}
              {!peersLoading && peers.length === 0 && (
                <div style={{ color: "#9faacb", marginBottom: 7 }}>Нет пользователей</div>
              )}
              {peers.map((user) => (
  <div key={user.id} className={styles.sidebarSharedUser}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
      <div>
        <div style={{
          fontSize: "0.98rem",
          color: "#e7ecff",
          fontWeight: 500,
        }}>
          {user.displayName}
        </div>
        <div style={{
          fontSize: "0.87rem",
          color: "#bac9e5",
          opacity: 0.78,
        }}>
          {user.email}
        </div>
      </div>
    </div>
    <button
      className={styles.sidebarSmallBtn}
      title="Удалить доступ"
      style={{
        marginLeft: 7,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer"
      }}
      onClick={() => openRemovePeer(user)}
    >
      <X size={16} />
    </button>
  </div>
))}
<RemovePeerModal
  open={removePeerOpen}
  onOpenChange={setRemovePeerOpen}
  peerName={peerToRemove?.name}
  peerId={peerToRemove?.id}
  onRemoved={() => {
    setRemovePeerOpen(false);
    setPeerToRemove(null);
    refetchPeers();
    reloadAccounts();
  }}
/>
              <AddPeerModal
  open={addPeerOpen}
  onOpenChange={open => {
    setAddPeerOpen(open);
    if (!open) {
      refetchPeers();
      reloadAccounts();
    }
  }}
  onAdded={() => {
    refetchPeers();
    reloadAccounts();
  }}
/>
              <button
                className={styles.sidebarAddBtn}
                onClick={() => setAddPeerOpen(true)}
              >
                <Plus size={16} />
                <span>Добавить аккаунт</span>
              </button>
            </div>
          </div>
        </section>
        <AddAccountModal open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>
    </div>
  );
}