import { Merienda } from "next/font/google";
import "@/styles/shop.css";
import "@/styles/shop-extra.css";
import { ShopShell } from "@/components/shop/shop-shell";

const merienda = Merienda({ variable: "--font-merienda", subsets: ["latin"], weight: ["700"] });

/** The Buyer Web frame. Every route here starts with /buyer. The legacy CSS is
 * scoped under `.eg-shop`, so the admin and seller panels are not affected. */
export default function BuyerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`eg-shop ${merienda.variable}`}>
      <ShopShell>{children}</ShopShell>
    </div>
  );
}
