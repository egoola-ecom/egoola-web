"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/seller-form/field";
import styles from "@/components/seller-form/seller-form.module.css";
import { changeSellerPassword } from "@/lib/seller-me-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../seller-shell.module.css";
import { useSeller } from "../seller-context";

/** `POST /seller/me/change-password/`. The current token keeps working, so the
 * seller stays signed in. 400s show under the right field: a wrong current
 * password, or a new one that is weak or the same as the old one. */
export function PasswordClient() {
  const { handleAuthError } = useSeller();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const err = (key: string) => errors[key]?.join(" ");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setNotice(null);
    setFormError(null);

    if (next !== confirm) {
      setErrors({ confirm: ["The two new passwords do not match."] });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = await changeSellerPassword(current, next);
      setNotice(result.detail || "Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (caught) {
      if (!handleAuthError(caught)) {
        const { fieldErrors, message } = parseFieldErrors(caught);
        setErrors(fieldErrors);
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className={shell.pageTitle}>Change password</h1>
      <p className={shell.pageText}>You stay signed in after changing it.</p>
      <form className={styles.card} onSubmit={handleSubmit}>
        {formError && (
          <div className={styles.errorSummary} role="alert">
            {formError}
          </div>
        )}
        {notice && (
          <p className={styles.successNote} role="status">
            {notice}
          </p>
        )}
        <Field id="pw-current" label="Current password" required error={err("current_password")}>
          <input
            id="pw-current"
            type="password"
            className={inputClass(Boolean(err("current_password")))}
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
        </Field>
        <Field
          id="pw-new"
          label="New password"
          required
          error={err("new_password")}
          note="At least 8 characters, not a common password, not only digits, and different from the current one."
        >
          <input
            id="pw-new"
            type="password"
            className={inputClass(Boolean(err("new_password")))}
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
        </Field>
        <Field id="pw-confirm" label="Repeat the new password" required error={err("confirm")}>
          <input
            id="pw-confirm"
            type="password"
            className={inputClass(Boolean(err("confirm")))}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
        <button
          type="submit"
          className={styles.primaryLink}
          style={{ border: "none", cursor: "pointer" }}
          disabled={saving}
        >
          {saving ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
