/** Fields that are never compared with the saved record — they are write-only
 * (a password, a new picture, files) and are sent whenever they carry something. */
const WRITE_ONLY = ["password", "profile_pic", "media_for", "media_file", "media_delete_ids"];

/** The location ids form one branch of the geography tree, so when any of them
 * changes all four are sent together (a lone state change would leave the old
 * city on the wrong branch, which the server rejects). */
const GEOGRAPHY = ["country", "state", "city", "thana"];

/** Blank values compare equal: the server returns null for what the form shows
 * as "", and an empty list for what it stores as null. */
function normalise(value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value) && value.length === 0) return "";
  return JSON.stringify(value);
}

/**
 * The fields of a saved record's form input that really changed — so an edit
 * sends a PATCH with only those, as the backend expects. Write-only fields
 * (password, picture, document files / removals) are included when filled in.
 * An empty result means there is nothing to save.
 */
export function pickChanged<T extends object>(initial: object, input: T): Partial<T> {
  const saved = initial as Record<string, unknown>;
  const entries = Object.entries(input) as [string, unknown][];
  const geographyChanged = GEOGRAPHY.some((key) => {
    const entry = entries.find(([name]) => name === key);
    return entry !== undefined && normalise(entry[1]) !== normalise(saved[key]);
  });

  const changed: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (WRITE_ONLY.includes(key)) {
      const filled = Array.isArray(value) ? value.length > 0 : Boolean(value);
      if (filled) changed[key] = value;
    } else if (GEOGRAPHY.includes(key)) {
      if (geographyChanged) changed[key] = value;
    } else if (normalise(value) !== normalise(saved[key])) {
      changed[key] = value;
    }
  }
  return changed as Partial<T>;
}
