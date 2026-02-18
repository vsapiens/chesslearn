"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "/play/new", label: "New Game" },
  { href: "/learn", label: "Learn" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between sm:justify-start sm:gap-6">
        <Link
          href="/"
          className="text-lg font-bold text-amber-400 tracking-tight"
        >
          ChessLearn
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-zinc-300 hover:text-white transition-colors"
            >
              {l.label}
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
            className={`block w-5 h-0.5 bg-zinc-300 transition-transform ${
              open ? "translate-y-[3px] rotate-45" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-zinc-300 mt-1 transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-zinc-300 mt-1 transition-transform ${
              open ? "-translate-y-[5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden mt-3 flex flex-col border-t border-zinc-800 pt-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-zinc-300 hover:text-white transition-colors py-3 min-h-touch flex items-center"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
