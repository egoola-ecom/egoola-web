import { authFetch } from "@/lib/auth";
import { ENDPOINTS } from "../endpoints";

// Buyer address book (egoola-server docs/buyer-address-api-guide.md). A short
// list of saved delivery addresses, newest first, returned as a plain array
// with no paging. Another buyer's id is a 404, never a 403. Deleting an
// address never changes a past order: checkout copies the address.

export interface BuyerAddress {
  id: number;
  name: string;
  phone: string;
  country: number;
  state: number;
  city: number;
  thana: number;
  /** The place names, sent by the server beside each id. */
  country_name: string | null;
  state_name: string | null;
  city_name: string | null;
  thana_name: string | null;
  address_line1: string;
  address_line2: string | null;
  zip: string | null;
  created_at: string;
  updated_at: string;
}

/** "Thana, City, State, Country" from the names the server sends. */
export function placeText(a: Partial<Pick<BuyerAddress, "country_name" | "state_name" | "city_name" | "thana_name">>): string {
  return [a.thana_name, a.city_name, a.state_name, a.country_name].filter(Boolean).join(", ");
}

/** What the form sends. All four location levels are required here. */
export interface AddressInput {
  name: string;
  phone: string;
  country: number;
  state: number;
  city: number;
  thana: number;
  address_line1: string;
  address_line2?: string;
  zip?: string;
}

const ADDRESSES = ENDPOINTS.buyer.addresses;

export const listAddresses = () => authFetch<BuyerAddress[]>("buyer", ADDRESSES.list);

export const getAddress = (id: number) => authFetch<BuyerAddress>("buyer", ADDRESSES.detail(id));

export const createAddress = (input: AddressInput) =>
  authFetch<BuyerAddress>("buyer", ADDRESSES.list, { method: "POST", body: JSON.stringify(input) });

/** Partial: send only the fields that changed. The server checks the location
 * chain against the saved address with the new fields merged over it. */
export const updateAddress = (id: number, input: Partial<AddressInput>) =>
  authFetch<BuyerAddress>("buyer", ADDRESSES.detail(id), { method: "PATCH", body: JSON.stringify(input) });

export const deleteAddress = (id: number) => authFetch<void>("buyer", ADDRESSES.detail(id), { method: "DELETE" });

export interface AddressProblem {
  /** Messages by field name, for the place the buyer is looking at. */
  fields: Record<string, string>;
  general: string | null;
}

function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(" ");
  return typeof value === "string" ? value : "";
}

/** Reads a failed address call. A 400 is `{field: [messages]}`; a 404 is an
 * address that is not this buyer's (or is gone). */
export function addressProblem(err: unknown): AddressProblem {
  const status = (err as { status?: number })?.status;
  const body = (err as { body?: unknown })?.body;
  if (status === 404) return { fields: {}, general: "We couldn't find that address. It may already be deleted." };
  if (status === 400 && body && typeof body === "object") {
    const fields: Record<string, string> = {};
    let general: string | null = null;
    for (const [key, value] of Object.entries(body)) {
      const message = text(value);
      if (!message) continue;
      if (key === "detail" || key === "non_field_errors") general = message;
      else fields[key] = message;
    }
    if (general || Object.keys(fields).length) return { fields, general };
  }
  return { fields: {}, general: "Something went wrong. Please try again." };
}
