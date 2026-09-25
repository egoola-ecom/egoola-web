import Link from "next/link";

export default function PublicHomePage() {
  return (
    <div>
      <h1>Egoola</h1>
      <p>
        The public storefront lives here: browsing categories and listings,
        search, and everything a visitor can see without logging in.
      </p>
      <h2>Panels</h2>
      <ul>
        <li>
          <Link href="/buyer">Buyer dashboard</Link>
        </li>
        <li>
          <Link href="/seller">Seller dashboard</Link>
        </li>
        <li>
          <Link href="/admin/login">Admin login</Link>
        </li>
      </ul>
    </div>
  );
}