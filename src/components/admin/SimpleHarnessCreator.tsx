"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveCableWiring } from "@/actions/admin/cable-making";
import { CoreColourSelect } from "@/components/admin/CoreColourSelect";
import type { CablePartOption } from "@/lib/cable-parts";
import { coreColourDescription } from "@/lib/core-colours";
import {
  CABLE_WIRING_WIDTH, connectorPinTerminations, simpleHarnessSchema, simpleHarnessSvg, type SimpleHarness,
} from "@/lib/cable-wiring";

const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const secondary = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const blankCore = (index: number) => ({ core: `Core ${index + 1}`, spare: false, pin: "", printedLabel: "" });

export function SimpleHarnessCreator({ id, name, initial, parts, onAdvanced }: {
  id: string;
  name: string;
  initial?: SimpleHarness;
  parts: CablePartOption[];
  onAdvanced?: () => void;
}) {
  const [draft, setDraft] = useState<SimpleHarness>(initial ?? {
    version: 3,
    ends: [{ type: "CONNECTOR", name: "", pinCount: 0 }, { type: "BARE", name: "Bare wires" }],
    segments: [{ cableSpec: "", from: 0, to: 1, lengthMm: 0 }],
    cores: Array.from({ length: 4 }, (_, index) => blankCore(index)),
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const valid = simpleHarnessSchema.safeParse(draft);
  const svg = simpleHarnessSvg(name, valid.success ? valid.data : draft);
  const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const connector = draft.ends[0];
  const cable = draft.segments[0];

  function update(next: SimpleHarness) {
    setDraft(next);
    setError("");
    setMessage("");
  }
  function updateConnector(change: Partial<SimpleHarness["ends"][0]>) {
    update({ ...draft, ends: [{ ...connector, ...change }, draft.ends[1]] });
  }
  function updateCable(change: Partial<SimpleHarness["segments"][0]>) {
    update({ ...draft, segments: [{ ...cable, ...change }] });
  }
  function updateCore(index: number, change: Partial<SimpleHarness["cores"][number]>) {
    update({ ...draft, cores: draft.cores.map((core, i) => i === index ? { ...core, ...change } : core) });
  }

  return (
    <div className="space-y-5">
      {onAdvanced && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm print:hidden">
        <p>Making a harness with branches, multiple cables or two connectors?</p>
        <button type="button" className="mt-2 font-semibold text-blue-700 underline" onClick={onAdvanced}>Use the advanced creator</button>
        <p className="mt-1 text-slate-600">The advanced creator does not yet assign cable cores or printed wire labels.</p>
      </div>}
      <form className="space-y-5 print:hidden" noValidate onSubmit={(event) => {
        event.preventDefault();
        if (!valid.success) {
          const issue = valid.error.issues[0];
          const coreIndex = issue.path[0] === "cores" && typeof issue.path[1] === "number" ? issue.path[1] + 1 : null;
          let detail = issue.message;
          if (issue.path[0] === "ends" && issue.path[2] === "name") detail = "Enter the connector name.";
          if (issue.path[0] === "ends" && issue.path[2] === "pinCount") detail = "Enter the number of connector pin positions (1–320).";
          if (issue.path[0] === "segments" && issue.path[2] === "cableSpec") detail = "Enter the cable name or specification.";
          if (issue.path[0] === "segments" && issue.path[2] === "lengthMm") detail = "Enter a whole-number cut length in millimetres (1–1,000,000).";
          if (coreIndex && issue.path[2] === "core" && issue.code !== "custom") detail = "Enter a colour or identifier.";
          setError(`${coreIndex ? `Core ${coreIndex}: ` : ""}${detail}`);
          return;
        }
        startTransition(async () => {
          try {
            const result = await saveCableWiring(id, valid.data);
            setError(result.error ?? "");
            setMessage(result.message ?? "");
          } catch (error) {
            console.error("Could not save harness build sheet", error);
            setError("Could not save the build sheet. Please try again.");
          }
        });
      }}>
        <fieldset disabled={pending} className="space-y-5">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 1</p>
              <h2 className="text-lg font-semibold">Choose the connector</h2></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Connector from parts library (optional)
                <select className={field} value={connector.partId ?? ""} onChange={(event) => {
                  const part = parts.find((item) => item.id === event.target.value && item.kind === "CONNECTOR");
                  updateConnector({ partId: part?.id, name: part?.name ?? connector.name, partNumber: part?.partNumber ?? undefined });
                }}>
                  <option value="">Custom connector</option>
                  {parts.filter(({ kind }) => kind === "CONNECTOR").map((part) =>
                    <option key={part.id} value={part.id}>{part.name}{part.partNumber && ` · ${part.partNumber}`}</option>)}
                </select>
              </label>
              <label className="block text-sm">Connector name
                <input className={field} value={connector.name} maxLength={40} placeholder="e.g. Connector A"
                  onChange={(event) => updateConnector({ name: event.target.value })} />
              </label>
              <label className="block text-sm">Connector part number (optional)
                <input className={field} value={connector.partNumber ?? ""} maxLength={20}
                  onChange={(event) => updateConnector({ partNumber: event.target.value || undefined })} />
              </label>
              <label className="block text-sm">Number of pin positions
                <input className={field} type="number" min={1} max={320} step={1} value={connector.pinCount || ""}
                  placeholder="e.g. 4" onChange={(event) => updateConnector({ pinCount: Number(event.target.value) })} />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 2</p>
              <h2 className="text-lg font-semibold">Choose the cable</h2>
              <p className="mt-1 text-sm text-slate-600">The other end will be bare wires with the labels you enter below.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Cable from parts library (optional)
                <select className={field} value={cable.stockPartId ?? ""} onChange={(event) => {
                  const part = parts.find((item) => item.id === event.target.value && item.kind === "CABLE_STOCK");
                  updateCable({ stockPartId: part?.id, cableSpec: part?.name ?? cable.cableSpec, partNumber: part?.partNumber ?? undefined });
                }}>
                  <option value="">Custom cable</option>
                  {parts.filter(({ kind }) => kind === "CABLE_STOCK").map((part) =>
                    <option key={part.id} value={part.id}>{part.name}{part.partNumber && ` · ${part.partNumber}`}</option>)}
                </select>
              </label>
              <label className="block text-sm">Cable name or specification
                <input className={field} value={cable.cableSpec} maxLength={64} placeholder="e.g. 4-core screened cable"
                  onChange={(event) => updateCable({ cableSpec: event.target.value })} />
              </label>
              <label className="block text-sm">Cable part number (optional)
                <input className={field} value={cable.partNumber ?? ""} maxLength={20}
                  onChange={(event) => updateCable({ partNumber: event.target.value || undefined })} />
              </label>
              <label className="block text-sm">Cut length (mm)
                <input className={field} type="number" min={1} max={1_000_000} step={1} value={cable.lengthMm || ""}
                  placeholder="e.g. 500" onChange={(event) => updateCable({ lengthMm: Number(event.target.value) })} />
              </label>
              <label className="block text-sm">Number of cable cores
                <select className={field} value={draft.cores.length} onChange={(event) => {
                  const count = Number(event.target.value);
                  if (count < draft.cores.length && draft.cores.slice(count).some((core, index) =>
                    core.core !== `Core ${count + index + 1}` || core.colour || core.stripeColour || core.pin || core.printedLabel || core.spare) &&
                    !window.confirm("Reducing the core count removes the extra rows and their entries. Continue?")) return;
                  update({ ...draft, cores: count <= draft.cores.length
                    ? draft.cores.slice(0, count)
                    : [...draft.cores, ...Array.from({ length: count - draft.cores.length }, (_, index) => blankCore(draft.cores.length + index))] });
                }}>
                  {Array.from({ length: 40 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 3</p>
              <h2 className="text-lg font-semibold">Connect and label each wire</h2>
              <p className="mt-1 text-sm text-slate-600">Choose each core&apos;s colour and optional stripe, then enter the connector&apos;s actual pin marking and the label to print for the bare end. Mark unused cores as spare. Print physical labels separately.</p>
              <p className="mt-1 text-sm text-slate-600">Existing core identifiers are kept. Colours are shown only when selected; use a different identifier for cores with the same colours.</p></div>
            <div className="space-y-3">
              {draft.cores.map((core, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Core {index + 1}</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={core.spare} onChange={(event) => {
                        const spare = event.target.checked;
                        if (spare && (core.pin || core.printedLabel) && !window.confirm(`Mark core ${index + 1} as spare and clear its pin and printed label?`)) return;
                        updateCore(index, { spare, ...(spare ? { pin: "", printedLabel: "" } : {}) });
                      }} />
                      Spare / not connected
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="block text-sm">Core {index + 1} identifier
                      <input className={field} value={core.core} maxLength={40} placeholder={`Core ${index + 1}`}
                        onChange={(event) => updateCore(index, { core: event.target.value })} />
                    </label>
                    <CoreColourSelect label={`Core ${index + 1} colour`} value={core.colour}
                      onChange={(colour) => updateCore(index, { colour })} />
                    <CoreColourSelect label={`Core ${index + 1} stripe colour (optional)`} value={core.stripeColour}
                      onChange={(stripeColour) => updateCore(index, { stripeColour })} />
                    {!core.spare && <>
                      <label className="block text-sm">Core {index + 1} connector pin
                        <input className={field} value={core.pin} maxLength={16} placeholder="e.g. 1"
                          onChange={(event) => updateCore(index, { pin: event.target.value })} />
                      </label>
                      <label className="block text-sm">Core {index + 1} printed bare-end label
                        <input className={field} value={core.printedLabel} maxLength={40} placeholder="e.g. Signal"
                          onChange={(event) => updateCore(index, { printedLabel: event.target.value })} />
                      </label>
                    </>}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600">{valid.success
              ? `${connectorPinTerminations(valid.data)} connector pin terminations per harness. Saving updates the count for new work; existing batches are unchanged.`
              : "Complete the build sheet to calculate connector pin terminations for new work."}</p>
          </section>
          <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {pending ? "Saving…" : "Save build sheet"}
          </button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      </form>

      <section id="cable-wiring-preview" className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:border-0 print:p-0">
        <div className="print:hidden">
          <h2 className="text-lg font-semibold">Build sheet preview</h2>
          <p className="mt-1 text-sm text-slate-600">{valid.success ? "Ready to save, download or print." : "Preview only: complete every required detail before saving, downloading or printing."}</p>
        </div>
        {valid.success && <div className="flex flex-wrap gap-2 print:hidden">
          <a href={image} download="harness-build-sheet.svg" className={secondary}>Download SVG</a>
          <button type="button" className={secondary} onClick={() => window.print()}>Print build sheet</button>
        </div>}
        <div className="overflow-x-auto print:overflow-visible">
          <Image unoptimized loading="eager" src={image} alt={`Connector, cores and printed wire labels for ${name}`}
            width={CABLE_WIRING_WIDTH} height={100}
            className="h-auto w-full min-w-[700px] border border-slate-200 print:min-w-0 print:border-0" />
        </div>
        {valid.success && <article id="simple-print-sheet" className="hidden print:block">
          <h1>{name} — harness build sheet</h1>
          <p><strong>Connector:</strong> {valid.data.ends[0].name}
            {valid.data.ends[0].partNumber && ` (${valid.data.ends[0].partNumber})`} · {valid.data.ends[0].pinCount} pin positions</p>
          <p><strong>Cable:</strong> {valid.data.segments[0].cableSpec}
            {valid.data.segments[0].partNumber && ` (${valid.data.segments[0].partNumber})`} · {valid.data.cores.length} cores · Cut length: {valid.data.segments[0].lengthMm} mm</p>
          <table>
            <thead><tr><th>Connector pin</th><th>Core / colour</th><th>Printed bare-end label</th></tr></thead>
            <tbody>{valid.data.cores.map((core, index) => <tr key={index}>
              <td>{core.spare ? "Spare" : core.pin}</td>
              <td>
                {core.colour && <span aria-hidden="true" style={{
                  display: "inline-block", width: "18px", height: "10px", marginRight: "6px",
                  border: "1px solid #475569", printColorAdjust: "exact",
                  background: core.stripeColour
                    ? `repeating-linear-gradient(135deg, ${core.colour} 0 5px, ${core.stripeColour} 5px 10px)`
                    : core.colour,
                }} />}
                {core.core} — {coreColourDescription(core.colour, core.stripeColour)}
              </td>
              <td>{core.spare ? "Not connected / no label" : core.printedLabel}</td>
            </tr>)}</tbody>
          </table>
          <p>Print the physical wire labels separately. Spare cores are not connected.</p>
        </article>}
        <style>{`@media print {
          body:has(#simple-print-sheet) *:not(:has(#simple-print-sheet)):not(#simple-print-sheet):not(#simple-print-sheet *) { display: none !important; }
          body:has(#simple-print-sheet) *:has(#simple-print-sheet) { display: block !important; position: static !important; width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
          #simple-print-sheet { display: block !important; width: 100%; color: #000; font-size: 11pt; }
          #simple-print-sheet h1 { font-size: 16pt; font-weight: bold; margin-bottom: 12pt; }
          #simple-print-sheet p { margin: 6pt 0; overflow-wrap: anywhere; }
          #simple-print-sheet table { width: 100%; border-collapse: collapse; margin: 14pt 0; table-layout: fixed; }
          #simple-print-sheet th, #simple-print-sheet td { border: 1px solid #444; padding: 6pt; text-align: left; overflow-wrap: anywhere; }
          #simple-print-sheet thead { display: table-header-group; }
          #simple-print-sheet tr { break-inside: avoid; }
        }`}</style>
      </section>
    </div>
  );
}
