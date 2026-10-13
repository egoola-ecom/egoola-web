import login from "@/app/(public)/login/login.module.css";
import styles from "./seller-form.module.css";

/** Class for a text input / select / textarea, with the red border on error. */
export function inputClass(hasError?: boolean, extra?: string): string {
  return [login.input, hasError ? styles.inputError : "", extra ?? ""].filter(Boolean).join(" ");
}

/** A labelled form field with its note and error line. Shared by the seller
 * sign-up form and the seller's own profile screens. */
export function Field({
  id,
  label,
  required,
  error,
  note,
  full,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  note?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${login.field} ${full ? styles.full : ""}`}>
      <div className={login.labelRow}>
        <label className={login.label} htmlFor={id}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      </div>
      {children}
      {note && !error && <p className={styles.fieldNote}>{note}</p>}
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
