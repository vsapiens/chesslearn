"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "/play/new", label: "NEW GAME" },
  { href: "/learn", label: "LEARN" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-surface-border-bright bg-surface-panel/90 backdrop-blur-sm px-4 sm:px-6 py-3"
      style={{ boxShadow: "0 1px 12px rgba(0,255,65,0.06)" }}>
      <div className="flex items-center justify-between sm:justify-start sm:gap-6">
        <Link
          href="/"
          className="font-display text-lg font-bold text-phosphor text-glow tracking-wider"
        >
          CHESS://LEARN
          <span className="inline-block w-2 h-4 bg-phosphor ml-1 animate-type-cursor align-middle" />
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-sm text-phosphor-muted hover:text-phosphor transition-colors uppercase tracking-wide"
            >
              &gt; {l.label}
            </Link>
          ))}
        </div>

        {/* Hamburger button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="sm:hidden flex flex-col justify-center items-center w-touch h-touch -mr-2"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-phosphor transition-transform ${
              open ? "translate-y-[3px] rotate-45 shadow-phosphor" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-phosphor mt-1 transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-phosphor mt-1 transition-transform ${
              open ? "-translate-y-[5px] -rotate-45 shadow-phosphor" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden mt-3 flex flex-col border-t border-surface-border pt-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="font-mono text-sm text-phosphor-muted hover:text-phosphor transition-colors py-3 min-h-touch flex items-center uppercase tracking-wide"
            >
              &gt; {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
