"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDetail, getAdmin } from "@/lib/accounts-api";
import { ApiError } from "@/lib/api";
import { AuthError, clearSession, getSession } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/env";
import { initials } from "../../_shared/profile-sections";
import { AdminProfileView } from "../admin-profile-view";
import styles from "../../management.module.css";

export function AdminDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSelf] = useState(() => getSession("admin")?.id === id);

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
        if (cancelled) return;
        if (err instanceof AuthError) {
          clearSession("admin");
          router.replace("/admin/login");
          return;
        }
        // 403 for a plain admin carries the server's own explanation.
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

  if (loading) return <p className={styles.stateRow}>Loading…</p>;
  if (loadError || !admin) {
    return <p className={styles.errorBanner}>{loadError ?? "Admin not found."}</p>;
  }

  return (
    <div>
      <button type="button" className={styles.backLink} onClick={() => router.push("/admin/admins")}>
        ← Back to Admins
      </button>

      <div className={styles.detailHeader}>
        <span className={styles.avatarLg}>
          {admin.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveMediaUrl(admin.profile_pic_url) ?? undefined} alt="" />
          ) : (
            initials(admin.name)
          )}
        </span>
        <div className={styles.detailHeaderInfo}>
          <h1 className={styles.title}>
            {admin.name}
            {isSelf && <span className={styles.secondaryText}> (you)</span>}
          </h1>
          <p className={styles.subtitle}>
            {admin.email} · {admin.mobile}
          </p>
          <div className={styles.detailBadgeRow}>
            <span
              className={`${styles.badge} ${admin.type === "super_admin" ? styles.badgeAmber : styles.badgeGray}`}
            >
              {admin.type.replace("_", " ")}
            </span>
            <span
              className={`${styles.badge} ${admin.status === "active" ? styles.badgeGreen : styles.badgeGray}`}
            >
              {admin.status}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => router.push(`/admin/admins/${id}/edit`)}
        >
          Update
        </button>
      </div>

      <AdminProfileView admin={admin} />
    </div>
  );
}
