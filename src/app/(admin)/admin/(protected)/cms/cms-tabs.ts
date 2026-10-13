/** Top-level tabs of the CMS panel. Kept out of the client component so the
 * server page can validate the `?tab=` query param against it. */
export const CMS_TABS = [
  { key: "banners", label: "Banners" },
  { key: "email-templates", label: "Email Templates" },
  { key: "settings", label: "Site Settings" },
  { key: "logo", label: "Site Logo" },
] as const;

export type CmsTabKey = (typeof CMS_TABS)[number]["key"];

export function isCmsTabKey(value: string | undefined): value is CmsTabKey {
  return CMS_TABS.some((tab) => tab.key === value);
}
