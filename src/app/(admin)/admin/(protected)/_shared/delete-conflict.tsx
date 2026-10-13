import styles from "../management.module.css";

/** Shown when the server refuses a delete with 409 because something still
 * uses the record (a category, brand, attribute or value held by listings or
 * SKUs). The server's own message is displayed as-is, and the admin is offered
 * "Deactivate" — the safe alternative the message itself recommends. */
export function DeleteConflictBanner({
  message,
  onDeactivate,
  onDismiss,
}: {
  message: string;
  onDeactivate: () => void;
  onDismiss: () => void;
}) {
  return (
    <p className={styles.errorBanner}>
      {message}{" "}
      <button type="button" className={styles.actionButton} onClick={onDeactivate}>
        Deactivate instead
      </button>{" "}
      <button type="button" className={styles.actionButton} onClick={onDismiss}>
        Dismiss
      </button>
    </p>
  );
}
