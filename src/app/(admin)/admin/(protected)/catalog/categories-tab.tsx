"use client";

import { useState } from "react";
import { CategoryPanel } from "./category-panel";
import styles from "../management.module.css";

const TABS = [
  { key: "product", label: "Product Categories" },
  { key: "service", label: "Service Categories" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** The "Categories" tab inside the Catalog panel — categories are one tree
 * shared by product and service listings, split by `type`, so this has its
 * own nested Product/Service tab bar rather than a single flat list. */
export function CategoriesTab() {
  const [tab, setTab] = useState<TabKey>("product");

  return (
    <div>
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

      <CategoryPanel key={tab} type={tab} />
    </div>
  );
}
