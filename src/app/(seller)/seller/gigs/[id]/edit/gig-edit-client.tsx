"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import management from "@/app/(admin)/admin/(protected)/management.module.css";
import {
  GigForm,
  GigFormValues,
} from "@/app/(admin)/admin/(protected)/gigs/gig-form";
import { ApiError } from "@/lib/api";
import {
  SellerGigDetail,
  SellerGigInput,
  deleteSellerGigThumbnail,
  getSellerGig,
  putSellerGigThumbnail,
  syncSellerGigMedia,
  updateSellerGig,
} from "@/lib/seller-gig-api";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../../seller-shell.module.css";
import { SellerStatusChip, needsFixing, useListingFailure } from "../../../listings/listing-status";

/** Edit a gig. Only what changed is sent (packages with their `id`). The save
 * follows the status: pending stays pending, approved STAYS approved,
 * rejected / changes requested go back to pending on ANY save — saving IS
 * resubmitting, so there is no separate button. */
export function GigEditClient({
  id,
  initialMediaError,
  initialThumbnailError,
}: {
  id: number;
  initialMediaError: string | null;
  /** Set when the gig was just created but its thumbnail upload failed. */
  initialThumbnailError: string | null;
}) {
  const router = useRouter();
  const fail = useListingFailure();
  const [gig, setGig] = useState<SellerGigDetail | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialMediaError
      ? `The gig was created, but its files were not uploaded: ${initialMediaError} Add them again below.`
      : initialThumbnailError
        ? `The gig was created, but its thumbnail was not uploaded: ${initialThumbnailError} Choose the picture again below.`
        : null,
  );

  const load = useCallback(async () => {
    try {
      const detail = await getSellerGig(id);
      setGig(detail);
      setLoadError(null);
      return detail;
    } catch (err) {
      const message = fail(err);
      if (message != null) {
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "We couldn't find this gig. It may belong to someone else or have been removed."
            : message,
        );
      }
      return null;
    }
  }, [id, fail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().finally(() => setLoading(false));
  }, [load]);

  async function handleSubmit({ input, files, deleteIds }: GigFormValues) {
    if (!gig) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    const resubmits = needsFixing(gig.status);
    let saved = false;
    try {
      // A rejected / changes-requested gig is resubmitted by ANY save, even
      // one with nothing in it; other statuses only save real changes.
      if (Object.keys(input).length > 0 || resubmits) {
        await updateSellerGig(id, input as Partial<SellerGigInput>);
        saved = true;
      }
      if (files.length > 0 || deleteIds.length > 0) {
        await syncSellerGigMedia(id, files, deleteIds);
        saved = true;
      }
      router.push(`/seller/gigs/${id}?notice=${resubmits ? "resubmitted" : "saved"}`);
    } catch (err) {
      const message = fail(err);
      if (message == null) return;
      const parsed = parseFieldErrors(err);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.message ?? (Object.keys(parsed.fieldErrors).length === 0 ? message : null));
      if (saved) {
        // The text changes were saved; only the files failed. Show the saved
        // gig (fresh URLs) with the reason, so nothing is saved twice.
        setNotice("Your changes were saved, but the files were not uploaded. Add them again.");
        await load();
        setFormVersion((v) => v + 1);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  /** The thumbnail saves at once. The answer carries the gig's status: a
   * rejected / changes-requested gig goes back to pending when its picture
   * changes. Only that is updated here, so unsaved text in the form stays. */
  async function uploadThumbnail(file: File) {
    const result = await putSellerGigThumbnail(id, file);
    setGig((current) =>
      current
        ? { ...current, image_path: result.image_path, image_url: result.image_url, status: result.status }
        : current,
    );
    return result;
  }

  async function removeThumbnail() {
    await deleteSellerGigThumbnail(id);
    setGig((current) => (current ? { ...current, image_path: null, image_url: null } : current));
  }

  if (loading) return <p className={management.stateRow}>Loading…</p>;

  if (loadError || !gig) {
    return (
      <div>
        <Link href="/seller/gigs" className={management.backLink}>
          ← Back to my gigs
        </Link>
        <p className={management.errorBanner}>{loadError ?? "Gig not found."}</p>
      </div>
    );
  }

  const resubmits = needsFixing(gig.status);

  return (
    <div>
      <Link href={`/seller/gigs/${id}`} className={management.backLink}>
        ← Back to gig
      </Link>
      <h1 className={shell.pageTitle}>Edit gig</h1>
      <p className={shell.pageText}>
        {gig.title} <SellerStatusChip status={gig.status} />
      </p>

      {resubmits && (
        <div className={management.errorBanner} role="status">
          <strong>
            {gig.status === "rejected"
              ? "An admin rejected this gig."
              : gig.status === "changes_requested"
                ? "An admin asked for changes."
                : "This gig is a draft."}
          </strong>
          {gig.note && <div>Reason: {gig.note}</div>}
          <div>Fix it and save: saving sends it back to the admin for review.</div>
        </div>
      )}
      {gig.status === "approved" && (
        <p className={management.secondaryText} style={{ marginBottom: "0.75rem" }}>
          This gig is approved. Your changes are saved right away.
        </p>
      )}
      {notice && <p className={management.noticeBanner}>{notice}</p>}

      <div className={management.detailCard}>
        <GigForm
          key={`${gig.updated_at}-${formVersion}`}
          mode="edit"
          variant="seller"
          initial={gig}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/seller/gigs/${id}`)}
          onSubmit={handleSubmit}
          thumbnail={{
            actorType: "seller",
            loginPath: "/login",
            upload: uploadThumbnail,
            remove: removeThumbnail,
            onFailure: fail,
            confirmUpload: needsFixing(gig.status)
              ? "This gig was rejected or sent back for changes. Changing its thumbnail sends it back to the admin for review. Continue?"
              : undefined,
          }}
        />
      </div>
    </div>
  );
}
