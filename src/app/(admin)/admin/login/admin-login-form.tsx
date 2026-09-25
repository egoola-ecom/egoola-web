"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/eye-icon";
import { ApiError } from "@/lib/api";
import { getSession, login } from "@/lib/auth";
import styles from "./admin-login.module.css";

export function AdminLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getSession("admin")) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login("admin", email, password);
      router.push("/admin/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

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

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "Signing in…" : "Sign In"}
      </button>

      <p className={styles.footNote}>
        Restricted access — authorized personnel only. Lost access? Contact
        your system administrator.
      </p>
    </form>
  );
}
