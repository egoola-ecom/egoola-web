"use client";

import Link from "next/link";
import shell from "../../seller-shell.module.css";
import { useSeller } from "../seller-context";

/** Gigs are only for a seller who can operate (verified AND active). Every
 * other seller gets a locked page that says why — the two switches are never
 * mixed up: `inactive` on its own does not mean "not approved". */
export default function GigsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { me } = useSeller();
  if (me.can_operate) return <>{children}</>;

  let title = "Gigs are locked";
  let text = "Your application is under review. You can create gigs once an admin approves it.";
  if (me.verification_status === "rejected") {
    title = "Gigs are locked: your application was rejected";
    text =
      "Fix your profile and documents, then send your application again. Gigs open once an admin approves it.";
  } else if (me.verification_status === "verified") {
    title = "Gigs are locked: your account is paused";
    text = "An admin has to make your account active again before you can use gigs.";
  }

  return (
    <div>
      <h1 className={shell.pageTitle}>{title}</h1>
      <p className={shell.pageText}>{text}</p>
      <Link href="/seller/profile">Go to my profile</Link>
    </div>
  );
}
