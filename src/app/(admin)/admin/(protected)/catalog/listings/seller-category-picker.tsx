"use client";

import { useEffect, useMemo, useState } from "react";
import { SellerLookupCategory, listSellerCategories } from "@/lib/seller-listing-api";
import styles from "../../management.module.css";

interface Node {
  category: SellerLookupCategory;
  children: Node[];
}

/** The lookup list is flat (`parent` ids); this nests it. A category whose
 * parent is not in the list (the parent is inactive, so it is not offered)
 * becomes a top-level row, so an active sub-category can still be reached. */
function buildTree(rows: SellerLookupCategory[]): Node[] {
  const byId = new Map<number, Node>();
  for (const category of rows) byId.set(category.id, { category, children: [] });
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.category.parent != null ? byId.get(node.category.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const order = (a: Node, b: Node) =>
    a.category.sort_order - b.category.sort_order || a.category.name.localeCompare(b.category.name);
  const sortAll = (nodes: Node[]) => {
    nodes.sort(order);
    nodes.forEach((node) => sortAll(node.children));
  };
  sortAll(roots);
  return roots;
}

function pathTo(nodes: Node[], id: number): Node[] | null {
  for (const node of nodes) {
    if (node.category.id === id) return [node];
    const below = pathTo(node.children, id);
    if (below) return [node, ...below];
  }
  return null;
}

function label(category: SellerLookupCategory): string {
  return category.name_bn ? `${category.name} (${category.name_bn})` : category.name;
}

/** Keeps a node when it or anything below it matches the search. */
function filterTree(nodes: Node[], query: string): Node[] {
  const needle = query.toLowerCase();
  const result: Node[] = [];
  for (const node of nodes) {
    const below = filterTree(node.children, query);
    const own =
      node.category.name.toLowerCase().includes(needle) ||
      (node.category.name_bn ?? "").toLowerCase().includes(needle);
    if (own || below.length > 0) result.push({ category: node.category, children: below });
  }
  return result;
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: Node;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div>
      <div
        className={`${styles.treeRow} ${node.category.id === selectedId ? styles.treeRowSelected : ""}`}
        style={{ paddingLeft: `${depth * 1.1 + 0.5}rem` }}
        onClick={() => onSelect(node.category.id)}
      >
        <span className={styles.treeToggle}>{node.children.length > 0 ? "▾" : ""}</span>
        <span>{label(node.category)}</span>
      </div>
      {node.children.map((child) => (
        <TreeRow
          key={child.category.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/** The seller's category chooser: a searchable tree built from
 * `GET /seller/lookups/categories/?type=…` (active categories only). Every
 * level can be chosen; the most specific one is best for browsing. */
export function SellerCategoryPicker({
  type,
  value,
  onChange,
  inputId = "listing-category-search",
}: {
  type: "product" | "service";
  value: number | null;
  onChange: (id: number | null) => void;
  inputId?: string;
}) {
  const [rows, setRows] = useState<SellerLookupCategory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    listSellerCategories(type)
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const tree = useMemo(() => buildTree(rows ?? []), [rows]);
  const shown = useMemo(
    () => (query.trim() ? filterTree(tree, query.trim()) : tree),
    [tree, query],
  );
  const path = value != null ? pathTo(tree, value) : null;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        Category
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
        {rows == null ? (
          <div className={styles.treeEmpty}>Loading categories…</div>
        ) : shown.length === 0 ? (
          <div className={styles.treeEmpty}>
            {failed ? "Couldn't load the categories. Reload the page to try again." : "No categories found."}
          </div>
        ) : (
          shown.map((node) => (
            <TreeRow
              key={node.category.id}
              node={node}
              depth={0}
              selectedId={value}
              onSelect={onChange}
            />
          ))
        )}
      </div>
      <p className={styles.fieldHint}>
        Selected: {path ? path.map((node) => label(node.category)).join(" › ") : "None selected"}
      </p>
    </div>
  );
}
