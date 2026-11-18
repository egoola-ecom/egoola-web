"use client";

import { useRef, useState } from "react";
import { AVATAR_TYPES, removeAvatar, setAvatar, type BuyerProfile } from "@/lib/buyer/buyer-profile-api";
import { fileSizeProblem, SIZE_HINT_IMAGE } from "@/lib/file-limits";
import { resolveMediaUrl } from "@/lib/env";
import { useFailure } from "./use-failure";

/** The picture, with Upload / Replace and (only when there is one) Remove. Each
 * action is its own call: it never rides along with the Save button. */
export function AvatarSection({ profile, onChange }: { profile: BuyerProfile; onChange: (next: BuyerProfile) => void }) {
  const fail = useFailure();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = resolveMediaUrl(profile.profile_pic_url);

  async function run(action: () => Promise<BuyerProfile>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      const problem = fail(err);
      if (problem) setError(problem.fields.image?.join(" ") ?? problem.general ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function pick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setError(`${file.name}: only JPG, PNG or WEBP files are accepted.`);
      return;
    }
    const problem = fileSizeProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    void run(() => setAvatar(file));
  }

  return (
    <div className="bg-white p-3 border mb-3 text-center" data-testid="avatar-section">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Your profile picture" width={140} height={140} className="rounded-circle mb-3" style={{ objectFit: "cover" }} data-testid="avatar-image" />
      ) : (
        <div
          className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3 text-muted"
          style={{ width: 140, height: 140, fontSize: 56 }}
          data-testid="avatar-placeholder"
        >
          <i className="fas fa-user" />
        </div>
      )}
      <p className="font-weight-bold mb-2">{profile.name}</p>
      <input
        ref={input}
        type="file"
        hidden
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        aria-label="Profile picture file"
        data-testid="avatar-file"
        onChange={(event) => pick(event.target.files?.[0])}
      />
      <div>
        <button type="button" className="btn btn-success btn-sm mr-2" disabled={busy} onClick={() => input.current?.click()} data-testid="avatar-upload">
          {busy ? "Working…" : src ? "Replace photo" : "Upload photo"}
        </button>
        {src && (
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void run(removeAvatar)} data-testid="avatar-remove">
            Remove
          </button>
        )}
      </div>
      <p className="text-muted small mt-2 mb-0">JPG, PNG or WEBP. {SIZE_HINT_IMAGE}</p>
      {error && (
        <p className="text-danger small mt-2 mb-0" role="alert" data-testid="avatar-error">
          {error}
        </p>
      )}
    </div>
  );
}
