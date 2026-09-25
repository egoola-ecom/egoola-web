"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeIcon } from "@/components/eye-icon";
import styles from "./login.module.css";

type Role = "buyer" | "seller";

export function LoginForm() {
  const [role, setRole] = useState<Role>("buyer");
  const [showPassword, setShowPassword] = useState(false);

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
          onClick={() => setRole("buyer")}
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
          onClick={() => setRole("seller")}
        >
          Seller
        </button>
      </div>

      <h1 className={styles.heading}>Sign in</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="account">
              Account
            </label>
          </div>
          <input
            id="account"
            name="account"
            type="text"
            className={styles.input}
            placeholder="Phone Number or Email"
            autoComplete="username"
            autoFocus
            required
          />
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

        <button type="submit" className={styles.submit}>
          Sign In as {role === "buyer" ? "Buyer" : "Seller"}
        </button>
      </form>

      <p className={styles.signup}>
        Need an Account?{" "}
        <Link href="/register" className={styles.signupLink}>
          Sign Up
        </Link>
      </p>
    </div>
  );
}
