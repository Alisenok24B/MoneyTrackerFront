"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { FullScreenSpinner } from "@/components/ui/FullScreenSpinner";

const PUBLIC = ["/login", "/register"];
const PRIVATE = ["/", "/analytics", "/profile"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    // 1. Публичные роуты: всегда доступны без токена
    if (PUBLIC.includes(pathname)) {
      if (token) {
        // Если уже есть токен — редиректим на главную
        router.replace("/");
        setAuthorized(false);
      } else {
        // Нет токена — спокойно рендерим login/register
        setAuthorized(true);
      }
      setChecking(false);
      return;
    }

    // 2. Приватные роуты: доступны только с токеном
    if (PRIVATE.some(route => pathname.startsWith(route))) {
      if (!token) {
        // Нет токена — редиректим на /login
        router.replace("/login");
        setAuthorized(false);
        setChecking(false);
        return;
      } else {
        // Есть токен — пропускаем
        setAuthorized(true);
        setChecking(false);
        return;
      }
    }

    // 3. Остальные страницы (например, 404)
    setAuthorized(true);
    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return <FullScreenSpinner />;
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}