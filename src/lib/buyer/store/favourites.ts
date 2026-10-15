"use client";

import { useStore } from "./local-store";

export type FavouriteKind = "gig" | "product";
export interface Favourite {
  kind: FavouriteKind;
  id: number;
}

const KEY = "egoola_buyer_favourites";
const EMPTY: Favourite[] = [];

export function useFavourites() {
  const [items, setItems] = useStore<Favourite[]>(KEY, EMPTY);
  const has = (kind: FavouriteKind, id: number) => items.some((f) => f.kind === kind && f.id === id);
  const toggle = (kind: FavouriteKind, id: number) =>
    setItems((prev) =>
      prev.some((f) => f.kind === kind && f.id === id)
        ? prev.filter((f) => !(f.kind === kind && f.id === id))
        : [...prev, { kind, id }],
    );
  return { items, has, toggle };
}
