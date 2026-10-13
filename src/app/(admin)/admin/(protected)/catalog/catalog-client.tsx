"use client";

import { useState } from "react";
import { AttributesPanel } from "./attributes-panel";
import { BrandsPanel } from "./brands-panel";
import { CategoriesTab } from "./categories-tab";
import { CATALOG_TABS, CatalogTabKey } from "./catalog-tabs";
import { MeasurementPanel } from "./measurement-panel";
import styles from "../management.module.css";

/** Listings have their own menu group (Pending Listings, All Listings); this
 * page keeps the lists they are built from. */
export function CatalogClient({ initialTab = "categories" }: { initialTab?: CatalogTabKey }) {
  const [tab, setTab] = useState<CatalogTabKey>(initialTab);

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Catalog</h1>
          <p className={styles.subtitle}>
            Everything behind the product and service catalog — categories, measurements, brands,
            attributes (sizes, colours…) that listings are built from.
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {CATALOG_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "measurements" && <MeasurementPanel />}
      {tab === "brands" && <BrandsPanel />}
      {tab === "attributes" && <AttributesPanel />}
    </div>
  );
}
