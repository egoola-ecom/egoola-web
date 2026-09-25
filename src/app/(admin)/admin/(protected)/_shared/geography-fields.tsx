"use client";

import { useGeographySelection } from "@/lib/use-geography-selection";
import styles from "../management.module.css";

/** How deep to render: "country" shows just the Country select, all the way
 * up to "thana" (the default) which shows all four — lets the Geography
 * management forms (which pick a parent chain, not a full address) reuse
 * this same cascading-select component at a shallower depth. */
export type GeographyDepth = "country" | "state" | "city" | "thana";

const DEPTH_ORDER: GeographyDepth[] = ["country", "state", "city", "thana"];

export function GeographyFields({
  geo,
  upTo = "thana",
}: {
  geo: ReturnType<typeof useGeographySelection>;
  upTo?: GeographyDepth;
}) {
  const show = (level: GeographyDepth) => DEPTH_ORDER.indexOf(level) <= DEPTH_ORDER.indexOf(upTo);
  const columnCount = DEPTH_ORDER.indexOf(upTo) + 1;

  return (
    <div
      className={styles.geoGrid}
      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
    >
      {show("country") && (
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
      )}
      {show("state") && (
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
      )}
      {show("city") && (
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
      )}
      {show("thana") && (
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
      )}
    </div>
  );
}
