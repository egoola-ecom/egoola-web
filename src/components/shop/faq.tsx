"use client";

import { createContext, useContext, useState } from "react";

const FaqContext = createContext<{ open: number | null; setOpen: (id: number | null) => void }>({
  open: null,
  setOpen: () => {},
});

/** The Help & Support accordion (legacy: Bootstrap collapse with data-parent):
 * one answer is open at a time. */
export function FaqAccordion({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <FaqContext.Provider value={{ open, setOpen }}>
      <div id="accordion">{children}</div>
    </FaqContext.Provider>
  );
}

export function FaqItem({ id, title, children }: { id: number; title: string; children: React.ReactNode }) {
  const { open, setOpen } = useContext(FaqContext);
  const isOpen = open === id;
  return (
    <div className="card mb-3">
      <div
        className={`card-header accor d-flex justify-content-between py-3 bg-white ${isOpen ? "" : "collapsed"}`}
        id={`q${id}`}
        role="button"
        aria-expanded={isOpen}
        aria-controls={`collapse${id}`}
        onClick={() => setOpen(isOpen ? null : id)}
      >
        <h6 className="mb-0 font-weight-bold">{title}</h6>
        <i className="fas fa-chevron-down" />
      </div>
      <div id={`collapse${id}`} className={`collapse ${isOpen ? "show" : ""}`} aria-labelledby={`q${id}`}>
        {children}
      </div>
    </div>
  );
}

/** A "Click Here" link inside an answer that opens another question. */
export function FaqLink({ to, children }: { to: number; children: React.ReactNode }) {
  const { setOpen } = useContext(FaqContext);
  return (
    <a
      href={`#q${to}`}
      className="text-success"
      onClick={(event) => {
        event.preventDefault();
        setOpen(to);
        document.getElementById(`q${to}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      {children}
    </a>
  );
}
