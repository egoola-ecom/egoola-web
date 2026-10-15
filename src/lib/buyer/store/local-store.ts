"use client";

import { useSyncExternalStore } from "react";

// Static build: the buyer's cart, favourites, orders and so on live in the
// browser (localStorage) until the API exists. One tiny store per key.

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeStore<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private window or blocked storage: the change simply is not kept.
  }
  listeners.get(key)?.forEach((fn) => fn());
}

export function readStore<T>(key: string, fallback: T): T {
  return read(key, fallback);
}

/** A localStorage-backed value that re-renders every component using it. */
export function useStore<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = (fn: () => void) => {
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(fn);
    window.addEventListener("storage", fn);
    return () => {
      set!.delete(fn);
      window.removeEventListener("storage", fn);
    };
  };
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const setValue = (next: T | ((prev: T) => T)) => {
    const prev = read(key, fallback);
    writeStore(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
  };
  return [value, setValue];
}
