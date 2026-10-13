"use client";

import { EducationEntry, ExperienceEntry } from "@/lib/profile-fields";
import { Field, inputClass } from "./field";
import styles from "./seller-form.module.css";

/** "a, b , c" -> ["a", "b", "c"] (blank pieces dropped). */
export function parseTags(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Skills / interests: one text box, comma separated. */
export function TagsField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field id={id} label={label} error={error} note="Separate with commas.">
      <input
        id={id}
        className={inputClass(Boolean(error))}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** Education rows: degree, institution, year. */
export function EducationRows({
  rows,
  onChange,
}: {
  rows: EducationEntry[];
  onChange: (rows: EducationEntry[]) => void;
}) {
  function patch(index: number, change: Partial<EducationEntry>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }
  return (
    <div className={styles.docList}>
      {rows.map((row, index) => (
        <div key={index} className={styles.repeatRow}>
          <input
            className={inputClass()}
            aria-label={`Education ${index + 1} degree`}
            placeholder="Degree"
            value={row.degree}
            onChange={(event) => patch(index, { degree: event.target.value })}
          />
          <input
            className={inputClass()}
            aria-label={`Education ${index + 1} institution`}
            placeholder="Institution"
            value={row.institution}
            onChange={(event) => patch(index, { institution: event.target.value })}
          />
          <input
            className={inputClass()}
            aria-label={`Education ${index + 1} year`}
            placeholder="Year"
            value={row.year}
            onChange={(event) => patch(index, { year: event.target.value })}
          />
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addButton}
        onClick={() => onChange([...rows, { degree: "", institution: "", year: "" }])}
      >
        + Add education
      </button>
    </div>
  );
}

/** Experience rows: title, company, from, to. */
export function ExperienceRows({
  rows,
  onChange,
}: {
  rows: ExperienceEntry[];
  onChange: (rows: ExperienceEntry[]) => void;
}) {
  function patch(index: number, change: Partial<ExperienceEntry>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }
  return (
    <div className={styles.docList}>
      {rows.map((row, index) => (
        <div key={index} className={styles.repeatRow}>
          <input
            className={inputClass()}
            aria-label={`Experience ${index + 1} title`}
            placeholder="Title"
            value={row.title}
            onChange={(event) => patch(index, { title: event.target.value })}
          />
          <input
            className={inputClass()}
            aria-label={`Experience ${index + 1} company`}
            placeholder="Company"
            value={row.company}
            onChange={(event) => patch(index, { company: event.target.value })}
          />
          <input
            className={inputClass()}
            aria-label={`Experience ${index + 1} from`}
            placeholder="From (year)"
            value={row.from}
            onChange={(event) => patch(index, { from: event.target.value })}
          />
          <input
            className={inputClass()}
            aria-label={`Experience ${index + 1} to`}
            placeholder="To (year)"
            value={row.to}
            onChange={(event) => patch(index, { to: event.target.value })}
          />
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.addButton}
        onClick={() => onChange([...rows, { title: "", company: "", from: "", to: "" }])}
      >
        + Add experience
      </button>
    </div>
  );
}
