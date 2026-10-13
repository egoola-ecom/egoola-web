"use client";

import { useState } from "react";
import { BannersPanel } from "./banners-panel";
import { CMS_TABS, CmsTabKey } from "./cms-tabs";
import { EmailTemplatesPanel } from "./email-templates-panel";
import { SettingsPanel } from "./settings-panel";
import { SiteLogoPanel } from "./site-logo-panel";
import styles from "../management.module.css";

export function CmsClient({ initialTab = "banners" }: { initialTab?: CmsTabKey }) {
  const [tab, setTab] = useState<CmsTabKey>(initialTab);

  return (
    <div>
      <div className={styles.pageHeading}>
        <div>
          <h1 className={styles.title}>CMS</h1>
          <p className={styles.subtitle}>
            Storefront content and configuration — banners, email templates, site settings and the
            site logo.
          </p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {CMS_TABS.map((item) => (
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

      {tab === "banners" && <BannersPanel />}
      {tab === "email-templates" && <EmailTemplatesPanel />}
      {tab === "settings" && <SettingsPanel />}
      {tab === "logo" && <SiteLogoPanel />}
    </div>
  );
}
