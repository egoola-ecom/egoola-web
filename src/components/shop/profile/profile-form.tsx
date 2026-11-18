"use client";

import { useState } from "react";
import { updateProfile, type BuyerProfile, type BuyerProfilePatch } from "@/lib/buyer/buyer-profile-api";
import type { FieldErrors } from "@/lib/use-managed-list";
import { EMPTY_GEO, GeoSelect, type GeoValue } from "../browse/geo-select";
import { useFailure } from "./use-failure";

const LISTS = [
  ["skills", "Skills"],
  ["experiences", "Experience"],
  ["interests", "Interests"],
  ["educations", "Education"],
] as const;
type ListKey = (typeof LISTS)[number][0];
const LEVELS = ["country", "state", "city", "thana"] as const;

/** One entry per line, blank lines dropped (the same as sign-up). */
const toLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const fromProfile = (p: BuyerProfile) => ({
  name: p.name,
  description: p.description ?? "",
  address_line: p.address_line ?? "",
  geo: Object.fromEntries(LEVELS.map((k) => [k, p[k] == null ? "" : String(p[k])])) as unknown as GeoValue,
  lists: Object.fromEntries(LISTS.map(([k]) => [k, (p[k] ?? []).join("\n")])) as Record<ListKey, string>,
});

/** The profile form. Email and phone are login identifiers: shown, never sent.
 * Save sends only the fields that changed. */
export function ProfileForm({ profile, onSaved }: { profile: BuyerProfile; onSaved: (next: BuyerProfile) => void }) {
  const fail = useFailure();
  const [start, setStart] = useState(() => fromProfile(profile));
  const [name, setName] = useState(start.name);
  const [description, setDescription] = useState(start.description);
  const [address, setAddress] = useState(start.address_line);
  const [geo, setGeo] = useState<GeoValue>(start.geo ?? EMPTY_GEO);
  const [lists, setLists] = useState(start.lists);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const err = (key: string) => errors[key]?.join(" ");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setSaved(false);
    setGeneral(null);
    if (!name.trim()) {
      setErrors({ name: ["Your name cannot be blank."] });
      return;
    }
    setErrors({});

    const patch: Record<string, unknown> = {};
    if (name.trim() !== start.name) patch.name = name.trim();
    if (description.trim() !== start.description) patch.description = description.trim();
    if (address.trim() !== start.address_line) patch.address_line = address.trim();
    for (const level of LEVELS) {
      if (geo[level] !== start.geo[level]) patch[level] = geo[level] ? Number(geo[level]) : null;
    }
    for (const [key] of LISTS) {
      if (lists[key] !== start.lists[key]) patch[key] = toLines(lists[key]);
    }
    if (Object.keys(patch).length === 0) {
      setSaved(true);
      return;
    }

    setBusy(true);
    try {
      const me = await updateProfile(patch as BuyerProfilePatch);
      const fresh = fromProfile(me);
      setStart(fresh);
      setName(fresh.name);
      setDescription(fresh.description);
      setAddress(fresh.address_line);
      setGeo(fresh.geo);
      setLists(fresh.lists);
      onSaved(me);
      setSaved(true);
    } catch (caught) {
      const problem = fail(caught);
      if (problem) {
        setErrors(problem.fields);
        setGeneral(problem.general ?? "Please fix the highlighted fields and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const shown = new Set(["name", "description", "address_line", "country", "state", "city", "thana", ...LISTS.map(([k]) => k)]);
  const others = Object.entries(errors).filter(([key, m]) => !shown.has(key) && m?.length);
  const geoErrors = Object.fromEntries(LEVELS.map((k) => [k, err(k)]));

  return (
    <form className="bg-white p-3 border" onSubmit={submit} noValidate data-testid="profile-form">
      <h5 className="mb-3">Your details</h5>
      {saved && (
        <p className="alert alert-success" role="status" data-testid="profile-saved">
          Your profile is saved.
        </p>
      )}
      {general && (
        <p className="alert alert-danger" role="alert" data-testid="profile-error">
          {general}
        </p>
      )}
      {others.length > 0 && (
        <ul className="text-danger small">
          {others.map(([key, m]) => (
            <li key={key}>
              {key}: {(m ?? []).join(" ")}
            </li>
          ))}
        </ul>
      )}

      <div className="form-row">
        <div className="form-group col-md-6">
          <label htmlFor="pf-email" className="font-weight-bold small mb-1">
            Email
          </label>
          <p id="pf-email" className="form-control-plaintext border-bottom" data-testid="profile-email">
            {profile.email ?? "—"}
          </p>
        </div>
        <div className="form-group col-md-6">
          <label htmlFor="pf-phone" className="font-weight-bold small mb-1">
            Phone
          </label>
          <p id="pf-phone" className="form-control-plaintext border-bottom" data-testid="profile-phone">
            {profile.phone}
          </p>
        </div>
        <p className="col-12 text-muted small mt-n2">Email and phone are what you sign in with, so they cannot be changed here.</p>
      </div>

      <div className="form-group">
        <label htmlFor="pf-name" className="font-weight-bold small mb-1">
          Full name
        </label>
        <input id="pf-name" className={`form-control${err("name") ? " is-invalid" : ""}`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        {err("name") && (
          <p className="text-danger small mt-1 mb-0" role="alert">
            {err("name")}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="pf-description" className="font-weight-bold small mb-1">
          About you
        </label>
        <textarea id="pf-description" rows={3} className={`form-control${err("description") ? " is-invalid" : ""}`} value={description} onChange={(e) => setDescription(e.target.value)} />
        {err("description") && (
          <p className="text-danger small mt-1 mb-0" role="alert">
            {err("description")}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="pf-address" className="font-weight-bold small mb-1">
          Street address
        </label>
        <input id="pf-address" className={`form-control${err("address_line") ? " is-invalid" : ""}`} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
        {err("address_line") && (
          <p className="text-danger small mt-1 mb-0" role="alert">
            {err("address_line")}
          </p>
        )}
      </div>

      <GeoSelect form value={geo} onChange={setGeo} errors={geoErrors} />

      {LISTS.map(([key, label]) => (
        <div className="form-group" key={key}>
          <label htmlFor={`pf-${key}`} className="font-weight-bold small mb-1">
            {label}
          </label>
          <textarea
            id={`pf-${key}`}
            rows={3}
            className={`form-control${err(key) ? " is-invalid" : ""}`}
            value={lists[key]}
            onChange={(e) => setLists({ ...lists, [key]: e.target.value })}
          />
          <small className="text-muted">One per line.</small>
          {err(key) && (
            <p className="text-danger small mt-1 mb-0" role="alert">
              {err(key)}
            </p>
          )}
        </div>
      ))}

      <button type="submit" className="btn btn-success" disabled={busy} data-testid="profile-save">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
