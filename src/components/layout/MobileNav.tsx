"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VatToggle } from "./VatToggle";

interface NavItem {
  label: string;
  href: string;
}

export function MobileNav({
  navItems,
  isLoggedIn,
}: {
  navItems: NavItem[];
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Keep the drawer in sync with browser back/forward and prevent background scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-1 border-t border-slate-100 px-2 py-3">
              <div className="px-3 py-2">
                <VatToggle />
              </div>
              <Link
                href={isLoggedIn ? "/account" : "/account/login"}
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700"
              >
                {isLoggedIn ? "My account" : "Sign in"}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
