"use client";

import { EducationEntry } from "@/lib/profile-fields";
import styles from "../management.module.css";

export function EducationRepeater({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: EducationEntry[];
  onChange: (next: EducationEntry[]) => void;
}) {
  function update(index: number, patch: Partial<EducationEntry>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className={styles.repeatGroup}>
      {value.map((edu, index) => (
        <div key={index} className={styles.repeatRow}>
          <button
            type="button"
            className={styles.repeatRowRemove}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            Remove
          </button>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-degree-${index}`}>
              Degree
            </label>
            <input
              id={`${idPrefix}-degree-${index}`}
              className={styles.input}
              value={edu.degree}
              onChange={(event) => update(index, { degree: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-institution-${index}`}>
              Institution
            </label>
            <input
              id={`${idPrefix}-institution-${index}`}
              className={styles.input}
              value={edu.institution}
              onChange={(event) => update(index, { institution: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-year-${index}`}>
              Year
            </label>
            <input
              id={`${idPrefix}-year-${index}`}
              className={styles.input}
              value={edu.year}
              onChange={(event) => update(index, { year: event.target.value })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className={styles.addRowButton}
        onClick={() => onChange([...value, { degree: "", institution: "", year: "" }])}
      >
        + Add education
      </button>
    </div>
  );
}
