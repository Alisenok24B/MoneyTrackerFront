/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      const res = await fetch('http://localhost:3333/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
  
      router.push('/login');
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
        autoComplete="off"
      >
        <h1 className={styles.title}>Регистрация</h1>
        {error && (
          <p className={styles.error}>{error}</p>
        )}
        <label className={styles.label}>
          Email
          <input
            type="email"
            required
            value={email}
            autoComplete="username"
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Отображаемое имя
          <input
            type="text"
            required
            value={displayName}
            autoComplete="nickname"
            onChange={e => setDisplayName(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Пароль
          <input
            type="password"
            required
            minLength={3}
            value={password}
            autoComplete="new-password"
            onChange={e => setPassword(e.target.value)}
            className={styles.input}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className={styles.button}
        >
          {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
        </button>
        <div className={styles.footer}>
          Уже есть аккаунт?
          <Link href="/login" className={styles.footerLink}>
            Войти
          </Link>
        </div>
      </form>
    </div>
  );
}