import { redirect } from "next/navigation";

// The Buyer Web (every route under /buyer) is the public home of the site.
export default function PublicHomePage() {
  redirect("/buyer");
}
