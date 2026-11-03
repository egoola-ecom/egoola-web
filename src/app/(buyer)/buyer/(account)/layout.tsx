import { Suspense } from "react";
import { RequireBuyer } from "@/components/shop/require-buyer";

/** Every screen that needs a signed-in buyer (cart, favourites, projects,
 * orders, messages, notifications, profile) lives in this route group. The
 * group name is not part of the URL. */
export default function BuyerAccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense>
      <RequireBuyer>{children}</RequireBuyer>
    </Suspense>
  );
}
