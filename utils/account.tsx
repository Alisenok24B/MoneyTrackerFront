"use client"

import React, { createContext, useContext, useState, useCallback } from "react";
import { APIAccount } from "@/lib/core.types";
import { getToken } from "@/utils/jwt";

export const AccountsContext = createContext<{
  accounts: APIAccount[];
  reloadAccounts: () => void;
  loading: boolean;
}>({
  accounts: [],
  reloadAccounts: () => {},
  loading: false,
});

export const AccountsProvider = ({ children }: { children: React.ReactNode }) => {
  const [accounts, setAccounts] = useState<APIAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadAccounts = useCallback(() => {
    const token = getToken();
    setLoading(true);
    fetch("/api/accounts", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then(async (res) => res.json())
      .then((data: { accounts?: APIAccount[] }) => {
        setAccounts(data.accounts ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    reloadAccounts();
  }, [reloadAccounts]);

  return (
    <AccountsContext.Provider value={{ accounts, reloadAccounts, loading }}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = () => useContext(AccountsContext);