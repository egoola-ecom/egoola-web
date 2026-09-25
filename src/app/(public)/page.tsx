import Link from "next/link";
import { CategoryIcon, type CategoryIconName } from "@/components/category-icon";
import styles from "./homepage.module.css";

const categories: { name: string; icon: CategoryIconName }[] = [
  { name: "Electronics", icon: "electronics" },
  { name: "Fashion", icon: "fashion" },
  { name: "Home & Living", icon: "home" },
  { name: "Freelance Services", icon: "freelance" },
  { name: "Digital Services", icon: "digital" },
  { name: "Grocery", icon: "grocery" },
];

const featuredProducts = [
  { name: "Wireless Earbuds", category: "Electronics", price: "৳1,450" },
  { name: "Cotton Panjabi", category: "Fashion", price: "৳980" },
  { name: "3-Seater Sofa Cover", category: "Home & Living", price: "৳2,200" },
  { name: "Rice — 25kg", category: "Grocery", price: "৳1,650" },
];

const featuredServices = [
  { name: "Home AC Servicing", category: "Home Services", price: "From ৳600" },
  { name: "Logo & Brand Design", category: "Digital Services", price: "From ৳2,500" },
  { name: "Wedding Photography", category: "Freelance Services", price: "From ৳8,000" },
  { name: "House Deep Cleaning", category: "Home Services", price: "From ৳1,200" },
];

export default function PublicHomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Buy, sell, and get things done — all in one place
          </h1>
          <p className={styles.heroSubtitle}>
            Egoola is Bangladesh&apos;s multi-vertical marketplace for
            products and freelance services.
          </p>
          <div className={styles.heroActions}>
            <Link href="/products" className={styles.heroButtonPrimary}>
              Browse Products
            </Link>
            <Link href="/services" className={styles.heroButtonSecondary}>
              Browse Services
            </Link>
          </div>
        </div>
      </section>

      <nav className={styles.quickLinks} aria-label="Browse by category">
        <div className={styles.quickLinksInner}>
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/products/${category.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={styles.quickLink}
            >
              <span className={styles.quickLinkIcon}>
                <CategoryIcon name={category.icon} />
              </span>
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Popular Products</h2>
          <span className={styles.sectionNote}>Example listings</span>
        </div>
        <div className={styles.cardGrid}>
          {featuredProducts.map((product) => (
            <div key={product.name} className={styles.card}>
              <div className={styles.cardMedia}>Product photo</div>
              <div className={styles.cardBody}>
                <p className={styles.cardCategory}>{product.category}</p>
                <p className={styles.cardName}>{product.name}</p>
                <p className={styles.cardPrice}>{product.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Popular Services</h2>
          <span className={styles.sectionNote}>Example listings</span>
        </div>
        <div className={styles.cardGrid}>
          {featuredServices.map((service) => (
            <div key={service.name} className={styles.card}>
              <div className={styles.cardMedia}>Service photo</div>
              <div className={styles.cardBody}>
                <p className={styles.cardCategory}>{service.category}</p>
                <p className={styles.cardName}>{service.name}</p>
                <p className={styles.cardPrice}>{service.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>How Egoola Works</h2>
        </div>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <p className={styles.stepTitle}>Create an account</p>
            <p className={styles.stepText}>
              Sign up in minutes as a buyer or a seller — one shared login,
              your choice of role.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <p className={styles.stepTitle}>Browse or list</p>
            <p className={styles.stepText}>
              Shop products and book services, or list what you sell — items
              and freelance work alike.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <p className={styles.stepTitle}>Order and pay securely</p>
            <p className={styles.stepText}>
              Checkout with bKash or card, and track every order from one
              dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.sellerBanner}>
        <div className={styles.sellerBannerInner}>
          <div className={styles.sellerBannerText}>
            <h2>Start selling on Egoola</h2>
            <p>
              Reach buyers across Bangladesh — list products or offer your
              freelance services to thousands of customers.
            </p>
          </div>
          <Link href="/login" className={styles.sellerBannerButton}>
            Become a Seller
          </Link>
        </div>
      </section>
    </>
  );
}
