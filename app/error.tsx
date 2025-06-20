'use client';

import React from 'react';
import Link from 'next/link';
import styles from './error.module.css';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Что-то пошло не так 😕</h1>
        <p className={styles.desc}>Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.</p>
        <div className={styles.buttons}>
          <button className={styles.tryAgain} onClick={reset}>Обновить</button>
          <Link href="/" className={styles.homeLink}>На главную</Link>
        </div>
        <div className={styles.errorDetails}>
          <code>{error.message}</code>
        </div>
      </div>
    </div>
  );
}