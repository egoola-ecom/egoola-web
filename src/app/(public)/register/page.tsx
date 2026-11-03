import { RegisterForm } from "./register-form";
import styles from "@/components/seller-form/seller-form.module.css";

export const metadata = { title: "Create your account" };

export default async function BuyerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.intro}>
          <h1 className={styles.introTitle}>Create your Egoola account</h1>
          <p className={styles.introText}>
            Your name, phone number and a password are all you need. You are signed in as soon as
            you finish, so there is no second step.
          </p>
        </div>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}
