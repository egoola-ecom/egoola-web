"use client";

import { useEffect, useState } from "react";
import { listCategories } from "@/lib/buyer/public-categories-api";
import type { PublicCategory } from "@/lib/buyer/types";

/** Service categories only, one drop-down per level: picking a category that
 * has children opens the next level. The deepest pick is the job's category.
 * `onChange` gets that id, or null while nothing is picked. */
export function CategoryPicker({
  currentName,
  onChange,
  error,
}: {
  /** Edit: the saved category's name. Its ancestors are not known, so it is
   * shown as text with a way to pick another. */
  currentName?: string;
  onChange: (id: number | null) => void;
  error?: string;
}) {
  const [levels, setLevels] = useState<PublicCategory[][]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [changing, setChanging] = useState(!currentName);

  useEffect(() => {
    if (!changing) return;
    void listCategories({ type: "service", page_size: 100 })
      .then((res) => setLevels([res.results]))
      .catch(() => setLevels([[]]));
  }, [changing]);

  async function pick(level: number, value: string) {
    const next = [...picked.slice(0, level), value];
    setPicked(next.filter(Boolean));
    setLevels((l) => l.slice(0, level + 1));
    const id = value ? Number(value) : null;
    // An empty pick falls back to the level above.
    onChange(id ?? (level > 0 ? Number(next[level - 1]) : null));
    const chosen = levels[level]?.find((c) => c.id === id);
    if (chosen?.has_children) {
      try {
        const children = await listCategories({ parent_id: chosen.id, page_size: 100 });
        setLevels((l) => [...l.slice(0, level + 1), children.results]);
      } catch {
        // The category itself stays picked.
      }
    }
  }

  if (!changing) {
    return (
      <div>
        <span data-testid="category-current">{currentName}</span>{" "}
        <button type="button" className="btn btn-link btn-sm" onClick={() => setChanging(true)}>
          Change category
        </button>
      </div>
    );
  }

  return (
    <div data-testid="category-picker">
      {levels.map((rows, level) => (
        <select
          key={level}
          className="form-control mb-2"
          aria-label={level === 0 ? "Category" : `Sub-category ${level}`}
          value={picked[level] ?? ""}
          onChange={(event) => void pick(level, event.target.value)}
        >
          <option value="">{level === 0 ? "Choose a category" : "Choose a sub-category"}</option>
          {rows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ))}
      {error && (
        <p className="text-danger small" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
