"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addressProblem,
  createAddress,
  updateAddress,
  type AddressInput,
  type BuyerAddress,
} from "@/lib/buyer/buyer-addresses-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { EMPTY_GEO, GeoSelect, type GeoValue } from "../browse/geo-select";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="font-weight-bold small mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-danger small mt-1 mb-0" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const asGeo = (a: BuyerAddress): GeoValue => ({
  country: String(a.country),
  state: String(a.state),
  city: String(a.city),
  thana: String(a.thana),
});

/** Create an address, or (with `initial`) edit one. The same form is meant to be
 * reused at checkout for "add a new address", so it knows nothing about the
 * page around it: it reports back through `onSaved` and `onCancel`. All four
 * location levels are required. The server is the judge of every rule, and its
 * message is shown under the field it names. */
export function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: BuyerAddress | null;
  onSaved: (saved: BuyerAddress) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [line1, setLine1] = useState(initial?.address_line1 ?? "");
  const [line2, setLine2] = useState(initial?.address_line2 ?? "");
  const [zip, setZip] = useState(initial?.zip ?? "");
  const [geo, setGeo] = useState<GeoValue>(initial ? asGeo(initial) : EMPTY_GEO);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFields({});
    setGeneral(null);

    const now = {
      name: name.trim(),
      phone: phone.trim(),
      address_line1: line1.trim(),
      address_line2: line2.trim(),
      zip: zip.trim(),
    };
    const place: Partial<Pick<AddressInput, "country" | "state" | "city" | "thana">> = {};
    for (const key of ["country", "state", "city", "thana"] as const) {
      if (geo[key]) place[key] = Number(geo[key]);
    }

    try {
      let saved: BuyerAddress;
      if (initial) {
        // Only what changed, so every other field stays exactly as it was.
        const patch: Partial<AddressInput> = {};
        for (const key of ["name", "phone", "address_line1"] as const) {
          if (now[key] !== initial[key]) patch[key] = now[key];
        }
        for (const key of ["address_line2", "zip"] as const) {
          if (now[key] !== (initial[key] ?? "")) patch[key] = now[key];
        }
        for (const key of ["country", "state", "city", "thana"] as const) {
          // A level the buyer emptied goes as null, so the server says it is
          // missing instead of silently keeping the old value.
          if (place[key] !== initial[key]) (patch as Record<string, number | null>)[key] = place[key] ?? null;
        }
        if (Object.keys(patch).length === 0) {
          onCancel();
          return;
        }
        saved = await updateAddress(initial.id, patch);
      } else {
        const body: Record<string, unknown> = { ...place, name: now.name, phone: now.phone, address_line1: now.address_line1 };
        if (now.address_line2) body.address_line2 = now.address_line2;
        if (now.zip) body.zip = now.zip;
        saved = await createAddress(body as unknown as AddressInput);
      }
      onSaved(saved);
    } catch (err) {
      if (isSignedOut(err)) {
        router.replace(loginUrlFor(window.location.pathname));
        return;
      }
      const problem = addressProblem(err);
      setFields(problem.fields);
      setGeneral(
        problem.general ??
          (Object.keys(problem.fields).length > 0 ? "Please fix the highlighted fields and try again." : null),
      );
    } finally {
      setBusy(false);
    }
  }

  // "required" / "may not be null" on a drop-down means nothing was picked.
  const levelError = (key: "country" | "state" | "city" | "thana") =>
    /required|null/i.test(fields[key] ?? "") ? `Select a ${key === "state" ? "state" : key}.` : fields[key];
  const geoErrors = {
    country: levelError("country"),
    state: levelError("state"),
    city: levelError("city"),
    thana: levelError("thana"),
  };
  const shown = new Set(["name", "phone", "address_line1", "address_line2", "zip", "country", "state", "city", "thana"]);
  const others = Object.entries(fields).filter(([key]) => !shown.has(key));

  return (
    <form className="bg-white p-3 mb-3 border" onSubmit={submit} noValidate data-testid="address-form">
      <h5 className="mb-3">{initial ? "Edit address" : "Add address"}</h5>
      {general && (
        <p className="alert alert-danger" role="alert" data-testid="form-error">
          {general}
        </p>
      )}
      {others.length > 0 && (
        <ul className="text-danger small">
          {others.map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      )}

      <div className="form-row">
        <div className="col-md-6">
          <Field label="Recipient name" error={fields.name}>
            <input
              className={`form-control${fields.name ? " is-invalid" : ""}`}
              aria-label="Recipient name"
              placeholder="Who will receive the order?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
        </div>
        <div className="col-md-6">
          <Field label="Phone" error={fields.phone}>
            <input
              className={`form-control${fields.phone ? " is-invalid" : ""}`}
              aria-label="Phone"
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </Field>
        </div>
      </div>

      <Field label="Address line 1" error={fields.address_line1}>
        <input
          className={`form-control${fields.address_line1 ? " is-invalid" : ""}`}
          aria-label="Address line 1"
          placeholder="House, road"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
        />
      </Field>
      <div className="form-row">
        <div className="col-md-8">
          <Field label="Address line 2 (optional)" error={fields.address_line2}>
            <input
              className={`form-control${fields.address_line2 ? " is-invalid" : ""}`}
              aria-label="Address line 2"
              placeholder="Flat, floor, landmark"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </Field>
        </div>
        <div className="col-md-4">
          <Field label="Zip code (optional)" error={fields.zip}>
            <input
              className={`form-control${fields.zip ? " is-invalid" : ""}`}
              aria-label="Zip code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              autoComplete="postal-code"
            />
          </Field>
        </div>
      </div>

      <GeoSelect form value={geo} onChange={setGeo} errors={geoErrors} />

      <button type="submit" className="btn btn-success mr-2" disabled={busy} data-testid="save-address">
        {busy ? "Saving…" : initial ? "Save changes" : "Save address"}
      </button>
      <button type="button" className="btn btn-light border" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </form>
  );
}
