"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { signInStaff } from "./actions";
import styles from "./login.module.css";

export default function StaffLogin() {
  const [state, formAction, pending] = useActionState(signInStaff, { error: "" });

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Public website</Link>
      <div className={styles.layout}>
        <div className={styles.brand}>
          <span className={styles.logo}><Image src="/images/kmax-mark.svg" alt="" width={54} height={35} preload /></span>
          <span><strong>KMAX</strong><small>STAFF WORKSPACE</small></span>
        </div>
        <section className={styles.card} aria-labelledby="login-title">
          <span className={styles.icon}><LockKeyhole size={22} aria-hidden="true" /></span>
          <h1 id="login-title">Staff sign in</h1>
          <p className={styles.intro}>Sign in with the account provided by your KMAX administrator.</p>
          <form action={formAction} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="staff-email">Email address</label>
              <input id="staff-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="staff-password">Password</label>
              <input id="staff-password" name="password" type="password" autoComplete="current-password" maxLength={1024} required aria-describedby={state.error ? "login-error" : undefined} />
            </div>
            {state.error && <p id="login-error" className={styles.error} role="alert">{state.error}</p>}
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Signing in…" : "Sign in"} {!pending && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>
          <p className={styles.help}>Need access or help signing in? Contact your administrator.</p>
        </section>
        <p className={styles.footer}>For authorized KMAX staff and administrators.</p>
      </div>
    </main>
  );
}
