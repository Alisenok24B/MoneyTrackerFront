import React from 'react';
import Link from 'next/link';
import styles from './error.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>404 — Страница не найдена</h1>
        <p className={styles.desc}>
          Возможно, вы попали не туда. Проверьте адрес или вернитесь на главную.
        </p>
        <Link href="/" className={styles.homeLink}>На главную</Link>
      </div>
    </div>
  );
}