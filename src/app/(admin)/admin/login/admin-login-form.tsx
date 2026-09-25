"use client";

import { useState } from "react";
import { EyeIcon } from "@/components/eye-icon";
import styles from "./admin-login.module.css";

export function AdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          placeholder="you@egoola.com"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className={styles.input}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>
      </div>

      <div className={styles.rememberRow}>
        <input id="remember" name="remember" type="checkbox" />
        <label htmlFor="remember">Keep me signed in</label>
      </div>

      <button type="submit" className={styles.submit}>
        Sign In
      </button>

      <p className={styles.footNote}>
        Restricted access — authorized personnel only. Lost access? Contact
        your system administrator.
      </p>
    </form>
  );
}
