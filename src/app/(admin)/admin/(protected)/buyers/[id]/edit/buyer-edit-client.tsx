"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BuyerDetail, BuyerInput, getBuyer, updateBuyer } from "@/lib/accounts-api";
import { AuthError, clearSession } from "@/lib/auth";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import { pickChanged } from "../../../_shared/changed-fields";
import { BuyerForm } from "../../buyer-form";
import styles from "../../../management.module.css";

/** Buyer Update page — reached only via the "Update" button on the Buyer
 * Details page. Saving or cancelling returns to that details page. */
export function BuyerEditClient({ id }: { id: number }) {
  const router = useRouter();
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
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

    getBuyer(id)
      .then((detail) => {
        if (!cancelled) setBuyer(detail);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setLoadError("Couldn't load this buyer. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(input: BuyerInput) {
    if (!buyer) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      // PATCH only what changed; nothing changed means nothing to save.
      const changes = pickChanged(buyer, input);
      if (Object.keys(changes).length > 0) await updateBuyer(id, changes);
      router.push(`/admin/buyers/${id}`);
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
  if (loadError || !buyer) {
    return <p className={styles.errorBanner}>{loadError ?? "Buyer not found."}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push(`/admin/buyers/${id}`)}
      >
        ← Back to Buyer Details
      </button>

      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Update Buyer</h1>
          <p className={styles.subtitle}>{buyer.name}</p>
        </div>
      </div>

      <div className={styles.detailCard}>
        <BuyerForm
          mode="edit"
          initial={buyer}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/admin/buyers/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
