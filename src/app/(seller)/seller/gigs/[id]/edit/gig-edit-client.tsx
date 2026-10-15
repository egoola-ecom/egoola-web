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
  getSellerGig,
  updateSellerGig,
} from "@/lib/seller-gig-api";
import { ListingFilesControl } from "@/components/listing-files-control";
import { FieldErrors, parseFieldErrors } from "@/lib/use-managed-list";
import shell from "../../../../seller-shell.module.css";
import { SellerStatusChip, needsFixing, useListingFailure } from "../../../listings/listing-status";

/** Edit a gig. Only what changed is sent (packages with their `id`). The save
 * follows the status: pending stays pending, approved STAYS approved,
 * rejected / changes requested go back to pending on ANY save — saving IS
 * resubmitting, so there is no separate button. */
export function GigEditClient({
  id,
  initialFilesError,
}: {
  id: number;
  /** Set when the gig was just created but its files were not uploaded. */
  initialFilesError: string | null;
}) {
  const router = useRouter();
  const fail = useListingFailure();
  const [gig, setGig] = useState<SellerGigDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialFilesError
      ? `The gig was created, but its files were not uploaded: ${initialFilesError} Add them again in the Files card below.`
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

  async function handleSubmit({ input }: GigFormValues) {
    if (!gig) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    const resubmits = needsFixing(gig.status);
    try {
      // A rejected / changes-requested gig is resubmitted by ANY save, even
      // one with nothing in it; other statuses only save real changes.
      if (Object.keys(input).length > 0 || resubmits) {
        await updateSellerGig(id, input as Partial<SellerGigInput>);
      }
      router.push(`/seller/gigs/${id}?notice=${resubmits ? "resubmitted" : "saved"}`);
    } catch (err) {
      const message = fail(err);
      if (message == null) return;
      const parsed = parseFieldErrors(err);
      setFieldErrors(parsed.fieldErrors);
      setFormError(parsed.message ?? (Object.keys(parsed.fieldErrors).length === 0 ? message : null));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
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

      <div className={management.detailCard} style={{ marginBottom: "1rem" }}>
        <h2 className={management.detailCardTitle}>Files</h2>
        <ListingFilesControl
          mode="live"
          scope="seller"
          loginPath="/login"
          listingId={id}
          imageUrl={gig.image_url}
          media={gig.media}
          onFailure={fail}
          onSaved={(result) =>
            setGig((current) =>
              current
                ? {
                    ...current,
                    image_path: result.image_path,
                    image_url: result.image_url,
                    media: result.media,
                    status: result.status,
                  }
                : current,
            )
          }
        />
        <p className={management.fieldHint}>
          Files are saved on their own and do not change the review status. Only saving the form
          below sends a rejected gig back for review.
        </p>
      </div>

      <div className={management.detailCard}>
        <GigForm
          key={gig.updated_at}
          mode="edit"
          variant="seller"
          initial={gig}
          fieldErrors={fieldErrors}
          formError={formError}
          submitting={submitting}
          onCancel={() => router.push(`/seller/gigs/${id}`)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
