import { LISTING_STATUS_OPTIONS } from "../catalog/listings/listing-utils";
import { GigsPanel } from "./gigs-panel";
import styles from "../management.module.css";

export const metadata = { title: "All Gigs" };

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initialStatus = LISTING_STATUS_OPTIONS.find((opt) => opt.value === status)?.value;
  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>All Gigs</h1>
          <p className={styles.subtitle}>
            Every service offer, from admins and sellers, priced by packages. Open one to see its
            details, decide on it and read its history. Products are under Listings.
          </p>
        </div>
      </div>
      <GigsPanel initialStatus={initialStatus} />
    </div>
  );
}
