import { notFound } from "next/navigation";
import { CategoryBrowser } from "@/components/shop/browse/category-browser";

export const metadata = { title: "Category — Egoola.com" };

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trail?: string }>;
}) {
  const { id } = await params;
  const { trail } = await searchParams;
  if (!/^\d+$/.test(id) || Number(id) < 1) notFound();
  const ancestors = (trail ?? "")
    .split(",")
    .filter((part) => /^\d+$/.test(part))
    .map(Number);
  return <CategoryBrowser parentId={Number(id)} trail={ancestors} />;
}
