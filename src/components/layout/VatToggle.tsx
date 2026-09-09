"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Lets customers choose whether prices are emphasised inc. or ex. VAT across the site. */
export function VatToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<"inc" | "ex">("inc");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )pgm_vat_display=([^;]*)/);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a browser-only cookie after hydration
    setMode(match?.[1] === "ex" ? "ex" : "inc");
  }, []);

  function select(next: "inc" | "ex") {
    setMode(next);
    document.cookie = `pgm_vat_display=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="hidden text-slate-500 sm:inline">Prices:</span>
      <div className="flex overflow-hidden rounded border border-slate-300">
        <button
          onClick={() => select("inc")}
          className={`px-2 py-1 ${mode === "inc" ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}
        >
          Inc. VAT
        </button>
        <button
          onClick={() => select("ex")}
          className={`px-2 py-1 ${mode === "ex" ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}
        >
          Ex. VAT
        </button>
      </div>
    </div>
  );
}
