"use client";

import { CORE_COLOURS } from "@/lib/core-colours";

const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

export function CoreColourSelect({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  const known = CORE_COLOURS.some(({ hex }) => hex === value?.toLowerCase());
  const custom = !!value && !known;
  const validHex = value && /^#[0-9a-f]{6}$/i.test(value);
  return <div className="space-y-2">
    <label className="block text-sm">{label}
      <select className={field} value={!value ? "" : known ? value.toLowerCase() : "custom"} onChange={(event) =>
        onChange(event.target.value === "custom" ? "#" : event.target.value || undefined)}>
        <option value="">Not specified</option>
        {CORE_COLOURS.map(({ name, hex }) => <option key={hex} value={hex}>{name}</option>)}
        <option value="custom">Other / custom colour</option>
      </select>
    </label>
    {custom && <div className="flex items-end gap-2">
      <label className="block flex-1 text-sm">Custom {label.toLowerCase()} hex
        <input className={field} value={value === "#" ? "" : value} maxLength={7} placeholder="#RRGGBB"
          onChange={(event) => onChange(event.target.value || "#")} />
      </label>
      <label className="text-sm">Pick
        <input type="color" className="mt-1 block h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
          aria-label={`Pick custom ${label.toLowerCase()}`} value={validHex ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>}
  </div>;
}
