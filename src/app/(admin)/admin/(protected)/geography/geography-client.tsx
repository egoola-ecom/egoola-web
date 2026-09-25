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

type TabKey = (typeof TABS)[number]["key"];

export function GeographyClient() {
  const [tab, setTab] = useState<TabKey>("countries");

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
            onClick={() => setTab(item.key)}
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
