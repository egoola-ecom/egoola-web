"use client";

import { useState } from "react";
import { SellerProfileChangeLog } from "@/lib/accounts-api";
import { resolveMediaUrl } from "@/lib/env";
import styles from "../management.module.css";

const KEY_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  present_address: "Present address",
  permanent_address: "Permanent address",
  country: "Country",
  state: "State",
  city: "City",
  thana: "Thana",
  skills: "Skills",
  education: "Education",
  experience: "Experience",
  interest: "Interests",
  profile_pic: "Profile photo",
  business_info: "Business profile",
  documents: "Documents",
  password: "Password",
};

interface DocumentSnapshot {
  id: number;
  media_for: string;
  media_type: string;
  media_url: string;
}

function labelFor(key: string): string {
  return KEY_LABELS[key] ?? key.replace(/_/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One readable line for a single value (a place, a list, text…). */
function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (isRecord(value) && "name" in value) return String(value.name);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((entry) => {
        if (!isRecord(entry)) return String(entry);
        // education / experience rows
        if ("degree" in entry) {
          return `${entry.degree ?? ""}, ${entry.institution ?? ""}${entry.year ? ` (${entry.year})` : ""}`;
        }
        if ("title" in entry) {
          return `${entry.title ?? ""} at ${entry.company ?? ""}${
            entry.from || entry.to ? ` (${entry.from ?? ""} – ${entry.to ?? ""})` : ""
          }`;
        }
        return JSON.stringify(entry);
      })
      .join("; ");
  }
  if (isRecord(value)) return JSON.stringify(value);
  return String(value);
}

/** A small picture that says so when its file is gone (deleted files are
 * really removed from storage, so an old photo can no longer exist). */
function Thumb({ url }: { url: unknown }) {
  const [broken, setBroken] = useState(false);
  const href = typeof url === "string" ? resolveMediaUrl(url) : null;
  if (!href) return <span className={styles.secondaryText}>—</span>;
  if (broken) return <span className={styles.secondaryText}>(file no longer stored)</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt="" className={styles.historyThumb} onError={() => setBroken(true)} />;
}

function Diff({
  label,
  before,
  after,
}: {
  label: string;
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    <div className={styles.diffLine}>
      <span className={styles.diffLabel}>{label}</span>
      <span className={styles.diffBefore}>{before}</span>
      <span className={styles.diffArrow} aria-label="changed to">
        →
      </span>
      <span className={styles.diffAfter}>{after}</span>
    </div>
  );
}

function documentList(value: unknown): DocumentSnapshot[] {
  return Array.isArray(value) ? (value as DocumentSnapshot[]) : [];
}

function DocumentLine({ doc }: { doc: DocumentSnapshot }) {
  return (
    <span>
      {doc.media_for.replace(/_/g, " ")} ({doc.media_type === "document" ? "PDF" : doc.media_type})
    </span>
  );
}

/** What changed under one key of one log row. */
function ChangeBlock({
  field,
  previous,
  next,
}: {
  field: string;
  previous: unknown;
  next: unknown;
}) {
  if (field === "password") {
    // The log never holds the password: both sides are the text "[hidden]".
    return <p className={styles.diffLine}>Password changed</p>;
  }

  if (field === "profile_pic") {
    return (
      <Diff label={labelFor(field)} before={<Thumb url={previous} />} after={<Thumb url={next} />} />
    );
  }

  if (field === "documents") {
    const before = documentList(previous);
    const after = documentList(next);
    const beforeIds = new Set(before.map((doc) => doc.id));
    const afterIds = new Set(after.map((doc) => doc.id));
    const added = after.filter((doc) => !beforeIds.has(doc.id));
    const removed = before.filter((doc) => !afterIds.has(doc.id));
    return (
      <div className={styles.diffLine}>
        <span className={styles.diffLabel}>{labelFor(field)}</span>
        <span>
          {added.map((doc) => (
            <span key={`a${doc.id}`} className={styles.diffAfter}>
              Added: <DocumentLine doc={doc} />
              {"  "}
            </span>
          ))}
          {removed.map((doc) => (
            <span key={`r${doc.id}`} className={styles.diffBefore}>
              Removed: <DocumentLine doc={doc} />
              {"  "}
            </span>
          ))}
          {added.length === 0 && removed.length === 0 && (
            <span className={styles.secondaryText}>No document added or removed.</span>
          )}
        </span>
      </div>
    );
  }

  if (field === "business_info") {
    // First time: previous is null and new is the whole object. Afterwards both
    // hold ONLY the sub-fields that changed — one mini diff line each.
    const before = isRecord(previous) ? previous : {};
    const after = isRecord(next) ? next : {};
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
      (key) => !(previous == null && (after[key] == null || after[key] === "")),
    );
    return (
      <div className={styles.diffGroup}>
        <span className={styles.diffLabel}>
          {labelFor(field)}
          {previous == null ? " (added)" : ""}
        </span>
        <div>
          {keys.map((key) => (
            <Diff
              key={key}
              label={labelFor(key)}
              before={formatValue(before[key])}
              after={formatValue(after[key])}
            />
          ))}
        </div>
      </div>
    );
  }

  return <Diff label={labelFor(field)} before={formatValue(previous)} after={formatValue(next)} />;
}

/** Seller Details: every saved change to the profile, newest first — by the
 * seller or an admin. Status and verification changes are NOT here (they are
 * in the verification history). One row per save; each changed key shows
 * "before → after". */
export function ProfileChangeHistory({ logs }: { logs: SellerProfileChangeLog[] }) {
  return (
    <div className={styles.detailCard}>
      <h2 className={styles.detailCardTitle}>Profile change history</h2>
      {logs.length === 0 ? (
        <p className={styles.stateRow}>No profile changes yet.</p>
      ) : (
        <ol className={styles.changeLog}>
          {logs.map((log) => (
            <li key={log.id} className={styles.changeRow}>
              <div className={styles.changeHead}>
                <strong>{log.creator_name}</strong>
                <span
                  className={`${styles.badge} ${
                    log.creator_type === "admin" ? styles.badgeGray : styles.badgeGreen
                  }`}
                >
                  {log.creator_type}
                </span>
                <span className={styles.secondaryText}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <div className={styles.changeBody}>
                {log.changed_fields.map((field) => (
                  <ChangeBlock
                    key={field}
                    field={field}
                    previous={log.previous_data?.[field]}
                    next={log.new_data?.[field]}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
