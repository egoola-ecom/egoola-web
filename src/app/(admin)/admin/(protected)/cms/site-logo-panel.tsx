"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteLogo, deleteSiteLogo, getSiteLogo, uploadSiteLogo } from "@/lib/cms-api";
import { AuthError, clearSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { parseFieldErrors } from "@/lib/use-managed-list";
import styles from "../management.module.css";

export function SiteLogoPanel() {
  const router = useRouter();
  const [logo, setLogo] = useState<SiteLogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
    getSiteLogo()
      .then((result) => {
        if (!cancelled) setLogo(result);
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setError("Couldn't load the site logo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setLogo(await uploadSiteLogo(file));
      setFile(null);
      setPreview(null);
      setNotice("Site logo updated.");
    } catch (err) {
      if (handleAuthError(err)) return;
      const { fieldErrors, message } = parseFieldErrors(err);
      setError(fieldErrors.image?.[0] ?? message ?? "Couldn't upload the logo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm("Remove the site logo? The logo file is deleted.")) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteSiteLogo();
      setLogo({ path: null, url: null });
      setNotice("Site logo removed.");
    } catch (err) {
      if (handleAuthError(err)) return;
      setError("Couldn't remove the logo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentUrl = resolveMediaUrl(logo?.url);
  const shownUrl = preview ?? currentUrl;

  return (
    <div className={styles.logoCard}>
      {error && <p className={styles.errorBanner}>{error}</p>}
      {notice && <p className={styles.noticeBanner}>{notice}</p>}

      <div className={styles.logoPreview}>
        {loading ? (
          "Loading…"
        ) : shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt="Site logo" />
        ) : (
          "No logo set"
        )}
      </div>
      {preview && <p className={styles.fieldHint}>Preview — not saved until you upload it.</p>}

      <div className={styles.rowActions}>
        <label className={styles.fileButton}>
          {currentUrl ? "Choose a new logo" : "Choose logo"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              setPreview(chosen ? URL.createObjectURL(chosen) : null);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className={styles.submitButton}
          disabled={!file || busy}
          onClick={handleUpload}
        >
          {busy ? "Working…" : currentUrl ? "Replace Logo" : "Upload Logo"}
        </button>
        {currentUrl && (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
            disabled={busy}
            onClick={handleRemove}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
