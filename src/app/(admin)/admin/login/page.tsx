import { AdminLoginForm } from "./admin-login-form";
import styles from "./admin-login.module.css";

export const metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <span className={styles.logo}>
            <span className={styles.logoDark}>eg</span>
            <span className={styles.logoGreen}>oola</span>
          </span>
          <span className={styles.badge}>Admin Panel</span>
        </div>

        <h1 className={styles.heading}>Sign in to the admin panel</h1>
        <p className={styles.subheading}>
          Separate from the buyer and seller login.
        </p>

        <AdminLoginForm />
      </div>
    </div>
  );
}
