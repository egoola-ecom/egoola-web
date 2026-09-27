"use client";

import { useState } from "react";
import { CategoriesTab } from "./categories-tab";
import { MeasurementPanel } from "./measurement-panel";
import styles from "../management.module.css";

const TABS = [
  { key: "categories", label: "Categories" },
  { key: "measurements", label: "Measurements" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CatalogClient() {
  const [tab, setTab] = useState<TabKey>("categories");

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Catalog</h1>
          <p className={styles.subtitle}>
            Reference data behind the product and service catalog — categories and measurements
            today, with more (listings) to follow.
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((item) => (
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
    </div>
  );
}
