"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listFavourites, removeFavourite, saveFavourite } from "../favourites-api";
import { loginUrlFor } from "../login-redirect";

// The buyer's saved listing ids, kept in memory so every heart on a page can
// paint without a call of its own. Loaded once per signed-in buyer (all pages
// of GET /buyer/favourites/), then changed optimistically: both directions are
// idempotent on the server, so a toggle only has to be undone if the call fails.
// A listing id is unique across products and gigs, so the id alone is the key.

interface State {
  userId: number | null;
  loaded: boolean;
  ids: ReadonlySet<number>;
}

const EMPTY: State = { userId: null, loaded: false, ids: new Set() };
let state: State = EMPTY;
let loading: number | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((fn) => fn());
}

async function load(userId: number) {
  if (loading === userId) return;
  loading = userId;
  try {
    const ids = new Set<number>();
    for (let page = 1; ; page += 1) {
      const result = await listFavourites({ page, page_size: 100 });
      result.results.forEach((f) => ids.add(f.listing.id));
      if (page >= result.total_pages) break;
    }
    // Merge, so a heart tapped while this was loading is not lost.
    if (loading === userId) set({ userId, loaded: true, ids: new Set([...ids, ...(state.userId === userId ? state.ids : [])]) });
  } catch {
    // Not signed in any more, or the server is down: hearts stay empty.
  } finally {
    if (loading === userId) loading = null;
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useFavourites() {
  const router = useRouter();
  const snapshot = useSyncExternalStore(subscribe, () => state, () => EMPTY);

  useEffect(() => {
    const session = getSession("buyer");
    if (!session) {
      if (state.userId !== null) set(EMPTY);
      return;
    }
    if (state.userId !== session.id) set({ userId: session.id, loaded: false, ids: new Set() });
    if (!state.loaded) void load(session.id);
  }, []);

  const has = useCallback((id: number) => snapshot.ids.has(id), [snapshot]);

  const toggle = useCallback(
    (id: number) => {
      const session = getSession("buyer");
      if (!session) {
        router.push(loginUrlFor(window.location.pathname + window.location.search));
        return;
      }
      const on = !state.ids.has(id);
      const ids = new Set(state.ids);
      if (on) ids.add(id);
      else ids.delete(id);
      set({ ...state, userId: session.id, ids });
      (on ? saveFavourite(id) : removeFavourite(id)).catch(() => {
        // Put the heart back the way it was.
        const back = new Set(state.ids);
        if (on) back.delete(id);
        else back.add(id);
        set({ ...state, ids: back });
      });
    },
    [router],
  );

  return { has, toggle, loaded: snapshot.loaded };
}
