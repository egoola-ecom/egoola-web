import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <div className={styles.page}>
      <div className={styles.promo}>
        <div className={styles.promoContent}>
          <span className={styles.logo}>
            <span className={styles.logoDark}>eg</span>
            <span className={styles.logoGreen}>oola</span>
          </span>
          <p className={styles.tagline}>
            Bangladesh&apos;s multi-vertical marketplace for products and
            freelance services. Sign in to buy, sell, or manage your orders.
          </p>
        </div>
      </div>

      <div className={styles.cardWrap}>
        <LoginForm initialRole={role === "seller" ? "seller" : "buyer"} />
      </div>
    </div>
  );
}
