"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryTreeNode, CategoryType, getCategoryTree } from "@/lib/category-api";
import styles from "../management.module.css";

/** Removes `excludeId` (and, since it's still nested inside, its whole
 * descendant subtree) from a tree — so the category being edited can't be
 * offered as its own indirect parent. The backend already rejects that as a
 * "circular category chain" 400; this just keeps the picker from offering a
 * choice it would reject. */
function pruneSubtree(nodes: CategoryTreeNode[], excludeId?: number): CategoryTreeNode[] {
  if (excludeId == null) return nodes;
  return nodes
    .filter((node) => node.id !== excludeId)
    .map((node) => ({ ...node, children: pruneSubtree(node.children, excludeId) }));
}

/** Depth-first search for `id`, returning the path from root to that node
 * (inclusive) — used to render the "Selected: …" breadcrumb below the tree. */
function findPath(nodes: CategoryTreeNode[], id: number): CategoryTreeNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = findPath(node.children, id);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

function collectIds(nodes: CategoryTreeNode[]): Set<number> {
  const ids = new Set<number>();
  function walk(list: CategoryTreeNode[]) {
    for (const node of list) {
      ids.add(node.id);
      walk(node.children);
    }
  }
  walk(nodes);
  return ids;
}

function TreeRow({
  node,
  depth,
  selectedId,
  expanded,
  activeOnly,
  onToggle,
  onSelect,
}: {
  node: CategoryTreeNode;
  depth: number;
  selectedId: number | null;
  expanded: Set<number>;
  activeOnly: boolean;
  onToggle: (id: number) => void;
  onSelect: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = node.id === selectedId;
  // An inactive category can't be chosen for a new listing (400), but it stays
  // in the tree so its active sub-categories can still be reached.
  const blocked = activeOnly && node.status === "inactive";

  return (
    <div>
      <div
        className={`${styles.treeRow} ${isSelected ? styles.treeRowSelected : ""}`}
        style={{
          paddingLeft: `${depth * 1.1 + 0.5}rem`,
          ...(blocked ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        }}
        title={blocked ? "Inactive categories can't be chosen" : undefined}
        aria-disabled={blocked || undefined}
        onClick={() => {
          if (!blocked) onSelect(node.id);
        }}
      >
        <span
          role="button"
          aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
          className={styles.treeToggle}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </span>
        <span>{node.name}</span>
        {node.status === "inactive" && (
          <span className={styles.secondaryText}>(inactive)</span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              activeOnly={activeOnly}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Searchable tree picker for a category's `parent` — replaces a flat
 * dropdown so multi-level trees stay browsable. Loads the full same-type
 * tree on mount, then re-fetches a filtered tree from the `categoryName`
 * query param as the admin types (debounced ~300ms); the current selection's
 * breadcrumb is always resolved against the unfiltered tree, so it keeps
 * showing even while a search is narrowing the browsable list. */
export function CategoryParentPicker({
  type,
  value,
  excludeId,
  onChange,
  label = "Parent category",
  noneLabel = "No parent (top-level)",
  inputId = "parent-search",
  activeOnly = false,
}: {
  type: CategoryType;
  value: number | null;
  excludeId?: number;
  onChange: (id: number | null) => void;
  /** Field label — the listing form reuses this picker to choose a
   * listing's own category. */
  label?: string;
  /** Text of the "nothing selected" row; `null` hides that row entirely
   * (for a required choice such as a listing's category). */
  noneLabel?: string | null;
  inputId?: string;
  /** Greys out inactive categories and refuses them as a choice — a new
   * listing may only use an active category. */
  activeOnly?: boolean;
}) {
  const [fullTree, setFullTree] = useState<CategoryTreeNode[]>([]);
  const [filteredTree, setFilteredTree] = useState<CategoryTreeNode[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    getCategoryTree({ type })
      .then((tree) => {
        setFullTree(tree);
        setExpanded(collectIds(tree));
      })
      .catch(() => setFullTree([]));
  }, [type]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) return;
    let cancelled = false;
    getCategoryTree({ type, categoryName: debouncedQuery })
      .then((tree) => {
        if (cancelled) return;
        setFilteredTree(tree);
        setExpanded(collectIds(tree));
      })
      .catch(() => {
        if (!cancelled) setFilteredTree([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type, debouncedQuery]);

  const displayTree = useMemo(
    () => pruneSubtree(debouncedQuery ? filteredTree : fullTree, excludeId),
    [fullTree, filteredTree, debouncedQuery, excludeId],
  );

  const selectedPath = value != null ? findPath(fullTree, value) : null;

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        className={styles.input}
        placeholder="Search categories…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.treeBox}>
        {noneLabel != null && (
          <div
            className={`${styles.treeRow} ${value == null ? styles.treeRowSelected : ""}`}
            onClick={() => onChange(null)}
          >
            <span className={styles.treeToggle} />
            <span>{noneLabel}</span>
          </div>
        )}
        {displayTree.length === 0 ? (
          <div className={styles.treeEmpty}>No categories found.</div>
        ) : (
          displayTree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={value}
              expanded={expanded}
              activeOnly={activeOnly}
              onToggle={toggle}
              onSelect={onChange}
            />
          ))
        )}
      </div>
      <p className={styles.fieldHint}>
        Selected:{" "}
        {selectedPath
          ? selectedPath.map((node) => node.name).join(" › ")
          : (noneLabel ?? "None selected")}
      </p>
    </div>
  );
}
