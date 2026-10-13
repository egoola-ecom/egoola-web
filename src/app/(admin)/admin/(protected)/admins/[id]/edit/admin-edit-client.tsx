"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDetail, AdminInput, getAdmin, updateAdmin } from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession, getSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { pickChanged } from "../../../_shared/changed-fields";
import { AdminForm } from "../../admin-form";
import styles from "../../../management.module.css";

/** Admin Update page — reached only via the "Update" button on the Admin
 * Details page. Saving or cancelling returns to that details page. */
export function AdminEditClient({ id }: { id: number }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSelf] = useState(() => getSession("admin")?.id === id);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleAuthError(err: unknown): boolean {
    if (err instanceof AuthError) {
      clearSession("admin");
      router.replace("/admin/login");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(null);

    getAdmin(id)
      .then((detail) => {
        if (!cancelled) setAdmin(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        const detail =
          err instanceof ApiError && err.body && typeof err.body === "object"
            ? (err.body as Record<string, unknown>).detail
            : null;
        setLoadError(
          typeof detail === "string" ? detail : "Couldn't load this admin. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(input: AdminInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      // PATCH only what changed; nothing changed means nothing to save. This
      // also keeps an admin's own `type` / `status` out of the request, which
      // the server refuses to change.
      const changes = admin ? pickChanged(admin, input) : input;
      if (Object.keys(changes).length > 0) await updateAdmin(id, changes);
      router.push(`/admin/admins/${id}`);
    } catch (err) {
      if (!handleAuthError(err)) {
        const { fieldErrors: fe, message } = parseFieldErrors(err);
        setFieldErrors(fe);
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !admin) {
    return <p className={styles.errorBanner}>{loadError ?? "Admin not found."}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(`/admin/admins/${id}`)}
      >
        ← Back to Admin Details
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Admin</h1>
          <p className={styles.subtitle}>{admin.name}</p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <AdminForm
          mode="edit"
          initial={admin}
          isSelf={isSelf}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/admin/admins/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
