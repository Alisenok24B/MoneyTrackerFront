// pages/login.tsx
"use client";

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { decodeJWT } from '@/utils/jwt';
import Link from 'next/link';
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:3333/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || 'Login failed');
      }

      const { access_token } = await res.json();
      // store token
      localStorage.setItem('token', access_token);

      // decode for immediate use (e.g. user id)
      const payload = decodeJWT<{ id: string; iat: number }>(access_token);
      localStorage.setItem('userId', payload.id);
      // redirect
      router.push('/');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
  <form
    onSubmit={handleSubmit}
    className={styles.formCard}
  >
    <h1 className={styles.title}>Вход</h1>
    {error && (
      <p className={styles.error}>{error}</p>
    )}
    <label className={styles.label}>
      Email
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={styles.input}
      />
    </label>
    <label className={styles.label}>
      Пароль
      <input
        type="password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        className={styles.input}
      />
    </label>
    <button
      type="submit"
      disabled={loading}
      className={styles.button}
    >
      {loading ? 'Входим...' : 'Войти'}
    </button>
    <div className={styles.footer}>
      Еще нет аккаунта?
      <Link href="/register" className={styles.footerLink}>
        Зарегистрироваться
      </Link>
    </div>
  </form>
</div>
  );
}