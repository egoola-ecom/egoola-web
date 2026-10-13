import { ListingsPanel } from "../listings-panel";
import { LISTING_STATUS_OPTIONS } from "./listing-utils";
import styles from "../../management.module.css";

export const metadata = { title: "All Listings" };

export default async function ListingsPage({
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
          <h1 className={styles.title}>All Listings</h1>
          <p className={styles.subtitle}>
            Every product and service listing, from admins and sellers. Open one to see its details,
            decide on it and read its history.
          </p>
        </div>
      </div>
      <ListingsPanel initialStatus={initialStatus} />
    </div>
  );
}
