"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerDetail, SellerInput, getSeller, updateSeller } from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { SellerForm } from "../../seller-form";
import styles from "../../../management.module.css";

/** Seller Update page — the editable profile form, reached only via the
 * "Update" button on the Seller Details page. Saving or cancelling returns
 * to that details page rather than the list. */
export function SellerEditClient({ id }: { id: number }) {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

    getSeller(id)
      .then((detail) => {
        if (!cancelled) setSeller(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (!handleAuthError(err)) {
          setLoadError("Couldn't load this seller. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(input: SellerInput) {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await updateSeller(id, input);
      router.push(`/admin/sellers/${id}`);
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

  if (loading) {
    return <p className={styles.stateRow}>Loading…</p>;
  }

  if (loadError || !seller) {
    return <p className={styles.errorBanner}>{loadError ?? "Seller not found."}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(`/admin/sellers/${id}`)}
      >
        ← Back to Seller Details
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Seller</h1>
          <p className={styles.subtitle}>{seller.name}</p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <SellerForm
          mode="edit"
          initial={seller}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/admin/sellers/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
