"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addressProblem,
  deleteAddress,
  listAddresses,
  placeText,
  type BuyerAddress,
} from "@/lib/buyer/buyer-addresses-api";
import { isSignedOut } from "@/lib/buyer/cart-errors";
import { loginUrlFor } from "@/lib/buyer/login-redirect";
import { AddressForm } from "./address-form";

export function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<BuyerAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<"new" | BuyerAddress | null>(null);
  const [confirming, setConfirming] = useState<BuyerAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAddresses()
      .then((rows) => {
        if (cancelled) return;
        setError(null);
        setAddresses(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname));
        else setError("We couldn't load your addresses. Please try again.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  async function remove(address: BuyerAddress) {
    setBusy(true);
    setNotice(null);
    try {
      await deleteAddress(address.id);
      setConfirming(null);
      setReload((n) => n + 1);
    } catch (err) {
      setConfirming(null);
      if (isSignedOut(err)) router.replace(loginUrlFor(window.location.pathname));
      else {
        setNotice(addressProblem(err).general);
        // A 404 means it is already gone: show the list as it really is.
        setReload((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-fluid p-587 my-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">My addresses</h4>
        {form === null && (
          <button type="button" className="btn btn-success" onClick={() => setForm("new")} data-testid="add-address">
            Add address
          </button>
        )}
      </div>

      {form !== null && (
        <AddressForm
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? null : form}
          onCancel={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setNotice(null);
            setReload((n) => n + 1);
          }}
        />
      )}

      {notice && (
        <p className="alert alert-danger" role="alert" data-testid="address-notice">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}

      {addresses === null && !error ? (
        <p className="text-muted py-5 text-center">Loading…</p>
      ) : addresses && addresses.length === 0 ? (
        <div className="text-center py-5" data-testid="addresses-empty">
          <p className="text-muted">You have no saved addresses yet.</p>
          {form === null && (
            <button type="button" className="btn btn-success" onClick={() => setForm("new")}>
              Add your first address
            </button>
          )}
        </div>
      ) : (
        <div className="row" data-testid="addresses-list">
          {(addresses ?? []).map((a) => (
            <div className="col-md-6 col-lg-4 mb-3" key={a.id}>
              <div className="bg-white p-3 border" data-testid="address-card">
                <p className="font-weight-bold mb-1" data-testid="address-name">
                  {a.name}
                </p>
                <p className="mb-1">
                  {a.address_line1}
                  {a.address_line2 ? `, ${a.address_line2}` : ""}
                </p>
                <p className="mb-1 text-muted small">
                  {placeText(a)}
                  {a.zip ? ` — ${a.zip}` : ""}
                </p>
                <p className="mb-2 small">
                  <i className="fas fa-phone-alt mr-1" /> {a.phone}
                </p>
                {confirming?.id === a.id ? (
                  <div className="alert alert-warning mb-0" data-testid="confirm-delete">
                    Delete this address? It is removed from your address book for good. Orders you
                    already placed are not changed.
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm mr-2"
                        disabled={busy}
                        onClick={() => void remove(a)}
                      >
                        Yes, delete
                      </button>
                      <button type="button" className="btn btn-light btn-sm border" onClick={() => setConfirming(null)}>
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      className="btn btn-light btn-sm border mr-2"
                      onClick={() => {
                        setNotice(null);
                        setForm(a);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        setNotice(null);
                        setConfirming(a);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
