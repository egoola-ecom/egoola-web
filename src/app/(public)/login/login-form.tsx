"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon } from "@/components/eye-icon";
import { ApiError } from "@/lib/api";
import { getSession, login } from "@/lib/auth";
import styles from "./login.module.css";

type Role = "buyer" | "seller";

export function LoginForm({ initialRole = "buyer" }: { initialRole?: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getSession("buyer")) {
      router.replace("/buyer");
    } else if (getSession("seller")) {
      router.replace("/seller");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("account") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login(role, email, password);
      router.push(role === "buyer" ? "/buyer" : "/seller");
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
    <div className={styles.card}>
      <div className={styles.cardLogo}>
        <span className={styles.logo}>
          <span className={styles.cardLogoDark}>eg</span>
          <span className={styles.logoGreen}>oola</span>
        </span>
      </div>

      <div className={styles.roleTabs} role="tablist" aria-label="Sign in as">
        <button
          type="button"
          role="tab"
          aria-selected={role === "buyer"}
          className={`${styles.roleTab} ${
            role === "buyer" ? styles.roleTabActive : ""
          }`}
          onClick={() => {
            setRole("buyer");
            setError(null);
          }}
        >
          Buyer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={role === "seller"}
          className={`${styles.roleTab} ${
            role === "seller" ? styles.roleTabActive : ""
          }`}
          onClick={() => {
            setRole("seller");
            setError(null);
          }}
        >
          Seller
        </button>
      </div>

      <h1 className={styles.heading}>Sign in</h1>

      <form onSubmit={handleSubmit}>
        {error && <p className={styles.formError}>{error}</p>}

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="account">
              {role === "seller" ? "Phone number" : "Email"}
            </label>
          </div>
          {/* Keyed by role so switching tabs never carries an email into the
              phone box (or the other way round). */}
          <input
            key={role}
            id="account"
            name="account"
            type={role === "seller" ? "tel" : "email"}
            inputMode={role === "seller" ? "tel" : "email"}
            className={styles.input}
            placeholder={role === "seller" ? "+8801XXXXXXXXX" : "Email"}
            autoComplete="username"
            autoFocus
            required
          />
          {role === "seller" && (
            <p className={styles.fieldHint}>
              Use the phone number you gave when you signed up, typed the same way.
            </p>
          )}
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forget Password?
            </Link>
          </div>
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
          <label htmlFor="remember">Stay Signed In</label>
        </div>

        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting
            ? "Signing in…"
            : `Sign In as ${role === "buyer" ? "Buyer" : "Seller"}`}
        </button>
      </form>

      <p className={styles.signup}>
        Need an Account?{" "}
        <Link
          href={role === "seller" ? "/seller/register" : "/register"}
          className={styles.signupLink}
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
