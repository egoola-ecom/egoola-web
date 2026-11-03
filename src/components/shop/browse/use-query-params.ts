"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The list screens keep every filter, the sort and the page in the URL, so a
 * filtered list can be shared, reloaded and reached with the back button. */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /** Change some values (`undefined` / "" removes one). A change to anything
   * but the page starts again from page 1. */
  function update(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in patch)) next.delete("page");
    const text = next.toString();
    router.replace(`${pathname}${text ? `?${text}` : ""}`, { scroll: false });
  }

  return { params, get: (key: string) => params.get(key) ?? "", update };
}
