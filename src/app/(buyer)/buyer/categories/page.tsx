import { CategoryBrowser } from "@/components/shop/browse/category-browser";

export const metadata = { title: "Categories — Egoola.com" };

export default function CategoriesPage() {
  return <CategoryBrowser parentId={null} trail={[]} />;
}
