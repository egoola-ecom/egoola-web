"use client";

import { ExperienceEntry } from "@/lib/profile-fields";
import styles from "../management.module.css";

export function ExperienceRepeater({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: ExperienceEntry[];
  onChange: (next: ExperienceEntry[]) => void;
}) {
  function update(index: number, patch: Partial<ExperienceEntry>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className={styles.repeatGroup}>
      {value.map((exp, index) => (
        <div key={index} className={styles.repeatRow}>
          <button
            type="button"
            className={styles.repeatRowRemove}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remove
          </button>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-title-${index}`}>
              Title
            </label>
            <input
              id={`${idPrefix}-title-${index}`}
              className={styles.input}
              value={exp.title}
              onChange={(event) => update(index, { title: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-company-${index}`}>
              Company
            </label>
            <input
              id={`${idPrefix}-company-${index}`}
              className={styles.input}
              value={exp.company}
              onChange={(event) => update(index, { company: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-from-${index}`}>
              From
            </label>
            <input
              id={`${idPrefix}-from-${index}`}
              className={styles.input}
              placeholder="e.g. 2020"
              value={exp.from}
              onChange={(event) => update(index, { from: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-to-${index}`}>
              To
            </label>
            <input
              id={`${idPrefix}-to-${index}`}
              className={styles.input}
              placeholder="e.g. 2023 or Present"
              value={exp.to}
              onChange={(event) => update(index, { to: event.target.value })}
            />
          </div>
          <div className={`${styles.field} ${styles.formGridFull}`}>
            <label className={styles.label} htmlFor={`${idPrefix}-description-${index}`}>
              Description (optional)
            </label>
            <textarea
              id={`${idPrefix}-description-${index}`}
              className={styles.textarea}
              value={exp.description ?? ""}
              onChange={(event) => update(index, { description: event.target.value })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className={styles.addRowButton}
        onClick={() =>
          onChange([...value, { title: "", company: "", from: "", to: "", description: "" }])
        }
      >
        + Add work experience
      </button>
    </div>
  );
}
