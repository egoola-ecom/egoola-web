"use client";

import { useState } from "react";
import { changePassword } from "@/lib/buyer/buyer-profile-api";
import type { FieldErrors } from "@/lib/use-managed-list";
import { useFailure } from "./use-failure";

/** A form of its own, apart from the profile's Save. The fields clear on
 * success; a 400 lands under the input it names. */
export function PasswordSection() {
  const fail = useFailure();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const err = (key: string) => errors[key]?.join(" ");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setDone(false);
    setGeneral(null);
    const problems: FieldErrors = {};
    if (!current) problems.current_password = ["Enter your current password."];
    if (!next) problems.new_password = ["Enter a new password."];
    if (next && confirm !== next) problems.confirm = ["The two passwords do not match."];
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (caught) {
      const problem = fail(caught);
      if (problem) {
        setErrors(problem.fields);
        setGeneral(problem.general);
      }
    } finally {
      setBusy(false);
    }
  }

  const input = (id: string, label: string, value: string, set: (v: string) => void, key: string, auto: string) => (
    <div className="form-group">
      <label htmlFor={id} className="font-weight-bold small mb-1">
        {label}
      </label>
      <input
        id={id}
        type="password"
        className={`form-control${err(key) ? " is-invalid" : ""}`}
        value={value}
        autoComplete={auto}
        onChange={(e) => set(e.target.value)}
      />
      {err(key) && (
        <p className="text-danger small mt-1 mb-0" role="alert" data-testid={`error-${key}`}>
          {err(key)}
        </p>
      )}
    </div>
  );

  return (
    <form className="bg-white p-3 border" onSubmit={submit} noValidate data-testid="password-form">
      <h5 className="mb-3">Change password</h5>
      {done && (
        <p className="alert alert-success" role="status" data-testid="password-done">
          Password changed. You are still signed in.
        </p>
      )}
      {general && (
        <p className="alert alert-danger" role="alert" data-testid="password-error">
          {general}
        </p>
      )}
      {input("pw-current", "Current password", current, setCurrent, "current_password", "current-password")}
      {input("pw-new", "New password", next, setNext, "new_password", "new-password")}
      {input("pw-confirm", "Confirm new password", confirm, setConfirm, "confirm", "new-password")}
      <button type="submit" className="btn btn-success" disabled={busy} data-testid="password-save">
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
