import Link from "next/link";
import styles from "./public-layout.module.css";

const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/egoolaofficial" },
  { name: "Instagram", href: "https://www.instagram.com/egoola.official/" },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UC8sJiN4r5G2vubAHJqYImWQ",
  },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/egoolaofficial/" },
  { name: "Twitter", href: "https://twitter.com/egoolaofficial" },
];

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoDark}>eg</span>
            <span className={styles.logoGreen}>oola</span>
          </Link>

          <form className={styles.search} action="/products">
            <input
              className={styles.searchInput}
              type="text"
              name="search"
              placeholder="What are you looking for..."
              aria-label="Search products and services"
            />
            <button className={styles.searchButton} type="submit">
              Search
            </button>
          </form>

          <nav className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>
              Login
            </Link>
            <Link href="/login" className={styles.sellButton}>
              Become a Seller
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <h2>
              EGOOLA <span className={styles.accent}>LIMITED</span>
            </h2>
            <p className={styles.footerTagline}>
              Easy <span className={styles.accent}>I</span> Helpful{" "}
              <span className={styles.accent}>I</span> Being
            </p>
            <p className={styles.footerAbout}>
              Egoola.com is Bangladesh&apos;s multi-vertical marketplace for
              products and freelance services.
            </p>
            <div className={styles.socialRow}>
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                  aria-label={social.name}
                >
                  {social.name.charAt(0)}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Our Services</h3>
            <ul className={styles.footerLinks}>
              <li>
                <Link href="/services">All Service Categories</Link>
              </li>
              <li>
                <Link href="/products/brand-wall">Brand Wall</Link>
              </li>
              <li>
                <Link href="/products/retail-shop">Retail Shop</Link>
              </li>
              <li>
                <Link href="/products/wholesale-shop">Wholesale Shop</Link>
              </li>
              <li>
                <Link href="/products/used-mall">Used Mall</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Our Quick Links</h3>
            <ul className={styles.footerLinks}>
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/help">Help &amp; Support</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href="/refund">Refund Policy</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={styles.footerHeading}>Download App</h3>
            <div className={styles.appBadges}>
              <span className={styles.appBadge}>
                <span className={styles.appBadgeLabel}>
                  <span>Get it on</span>
                  <span>Google Play</span>
                </span>
              </span>
              <span className={styles.appBadge}>
                <span className={styles.appBadgeLabel}>
                  <span>Download on the</span>
                  <span>App Store</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.copyright}>
          Copyright <span className={styles.accent}>&copy;</span>{" "}
          {new Date().getFullYear()} All Copy Rights Reserved{" "}
          <span className={styles.accent}>Egoola Limited</span>
        </div>
      </footer>
    </div>
  );
}
