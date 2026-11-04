"use client";

import { useState } from "react";
import { CountriesPanel } from "./countries-panel";
import { StatesPanel } from "./states-panel";
import { CitiesPanel } from "./cities-panel";
import { ThanasPanel } from "./thanas-panel";
import styles from "../management.module.css";

const TABS = [
  { key: "countries", label: "Countries" },
  { key: "states", label: "States" },
  { key: "cities", label: "Cities" },
  { key: "thanas", label: "Thanas" },
] as const;

export type GeographyTabKey = (typeof TABS)[number]["key"];
type TabKey = GeographyTabKey;

export function GeographyClient({ initialTab = "countries" }: { initialTab?: GeographyTabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Keep the tab in the address, so a reload or a shared link opens the same one.
  function openTab(key: TabKey) {
    setTab(key);
    window.history.replaceState(null, "", key === "countries" ? "/admin/geography" : `/admin/geography?tab=${key}`);
  }

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>Geography</h1>
          <p className={styles.subtitle}>
            Reference data used by address fields across the platform: Country, State, City, and
            Thana, in that order.
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tab} ${tab === item.key ? styles.tabActive : ""}`}
            onClick={() => openTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "countries" && <CountriesPanel />}
      {tab === "states" && <StatesPanel />}
      {tab === "cities" && <CitiesPanel />}
      {tab === "thanas" && <ThanasPanel />}
    </div>
  );
}
