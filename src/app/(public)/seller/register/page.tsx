import { RegisterForm } from "./register-form";
import styles from "@/components/seller-form/seller-form.module.css";

export const metadata = { title: "Become a Seller" };

export default function SellerRegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.intro}>
          <h1 className={styles.introTitle}>Become a seller on Egoola</h1>
          <p className={styles.introText}>
            Fill in your details and upload your identity documents. Our team reviews every
            request. You can log in right after signing up to complete your profile, and start
            selling once your account is approved and active.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
