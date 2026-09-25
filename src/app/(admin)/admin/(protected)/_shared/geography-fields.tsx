"use client";

import { useGeographySelection } from "@/lib/use-geography-selection";
import styles from "../management.module.css";

export function GeographyFields({
  geo,
}: {
  geo: ReturnType<typeof useGeographySelection>;
}) {
  return (
    <div className={styles.geoGrid}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="geo-country">
          Country
        </label>
        <select
          id="geo-country"
          className={styles.select}
          value={geo.countryId ?? ""}
          onChange={(event) =>
            geo.selectCountry(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">
            {geo.countries.length === 0 ? "No countries yet" : "Select country"}
          </option>
          {geo.countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="geo-state">
          State
        </label>
        <select
          id="geo-state"
          className={styles.select}
          value={geo.stateId ?? ""}
          disabled={!geo.countryId}
          onChange={(event) =>
            geo.selectState(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Select state</option>
          {geo.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="geo-city">
          City
        </label>
        <select
          id="geo-city"
          className={styles.select}
          value={geo.cityId ?? ""}
          disabled={!geo.stateId}
          onChange={(event) =>
            geo.selectCity(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Select city</option>
          {geo.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="geo-thana">
          Thana
        </label>
        <select
          id="geo-thana"
          className={styles.select}
          value={geo.thanaId ?? ""}
          disabled={!geo.cityId}
          onChange={(event) =>
            geo.selectThana(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Select thana</option>
          {geo.thanas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
