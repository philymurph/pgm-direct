"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveCableWiring } from "@/actions/admin/cable-making";
import { FullHarnessDrawing } from "@/components/admin/FullHarnessDrawing";
import type { CablePartOption } from "@/lib/cable-parts";
import { coreColourDescription } from "@/lib/core-colours";
import { connectorPinTerminations } from "@/lib/cable-wiring";
import { fullHarnessSchema, type FullHarness } from "@/lib/full-harness";
import { fullHarnessSvg } from "@/lib/full-harness-svg";

const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

function description(end: FullHarness["ends"][number], value: string) {
  return end.type === "CONNECTOR" ? `Pin ${value}` : end.type === "SPLICE" ? `Splice group ${value}` : `Label: ${value}`;
}

export function FullHarnessCreator({ id, name, initial, parts, hasHarnessImage }: {
  id: string; name: string; initial?: FullHarness; parts: CablePartOption[]; hasHarnessImage: boolean;
}) {
  const [draft, setDraft] = useState<FullHarness>(initial ?? { version: 4, ends: [], segments: [] });
  const [connector, setConnector] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const valid = fullHarnessSchema.safeParse(draft);
  const update = (next: FullHarness) => { setDraft(next); setError(""); setMessage(""); };
  const connectors = parts.filter((part) => part.kind === "CONNECTOR");
  const cables = parts.filter((part) => part.kind === "CABLE_STOCK");
  const updateSegment = (index: number, next: FullHarness["segments"][number]) =>
    update({ ...draft, segments: draft.segments.map((segment, i) => i === index ? next : segment) });
  const svg = valid.success ? fullHarnessSvg(name, valid.data) : null;
  return <div className="space-y-5">
    <div className="space-y-5 print:hidden">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">1. Add the ends</h2>
        <p className="text-sm text-slate-600">Add each connector, bare-wire end, or splice point. Add the same connector again if the harness uses more than one.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-52 flex-1 text-sm">Connector
            <select className={field} value={connector} onChange={(event) => setConnector(event.target.value)}>
              <option value="">Choose a connector</option>
              {connectors.map((part) => <option key={part.id} value={part.id}>{part.name}{part.pinCount === null ? " (complete its definition first)" : ""}</option>)}
            </select>
          </label>
          <button type="button" className={button} disabled={draft.ends.length >= 16} onClick={() => {
            const part = connectors.find((item) => item.id === connector);
            if (!part?.pinCount) { setError("Choose a connector with its pin count set in the parts library."); return; }
            update({ ...draft, ends: [...draft.ends, { type: "CONNECTOR", name: part.name, partId: part.id, imageId: part.imageId ?? undefined, partNumber: part.partNumber ?? undefined, pinCount: part.pinCount }] });
          }}>Add connector</button>
          <button type="button" className={button} disabled={draft.ends.length >= 16} onClick={() =>
            update({ ...draft, ends: [...draft.ends, { type: "BARE", name: `Bare wires ${draft.ends.filter((end) => end.type === "BARE").length + 1}` }] })}>Add bare wires</button>
          <button type="button" className={button} disabled={draft.ends.length >= 16} onClick={() =>
            update({ ...draft, ends: [...draft.ends, { type: "SPLICE", name: `Splice ${draft.ends.filter((end) => end.type === "SPLICE").length + 1}` }] })}>Add splice</button>
        </div>
        <Link href="/admin/cable-making/parts" className="text-sm text-blue-700 underline">Create or edit parts</Link>
        {draft.ends.map((end, index) => <div key={index} className="flex flex-wrap items-end gap-2 rounded bg-slate-50 p-3">
          <label className="min-w-52 flex-1 text-sm">End {index + 1}: {end.type === "CONNECTOR" ? `Connector (${end.pinCount} pins)` : end.type === "BARE" ? "Bare-wire end" : "Splice point"} name
            <input className={field} maxLength={40} value={end.name} onChange={(event) =>
              update({ ...draft, ends: draft.ends.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} />
          </label>
          {end.type === "CONNECTOR" && (() => {
            const part = parts.find((item) => item.id === end.partId);
            return <>
              {part && part.imageId !== (end.imageId ?? null) && <button type="button" className={button} onClick={() => {
                if (end.imageId && !window.confirm("Replace the image in this drawing with the current library image?")) return;
                update({ ...draft, ends: draft.ends.map((item, i) => i === index && item.type === "CONNECTOR"
                  ? { ...item, imageId: part.imageId ?? undefined } : item) });
              }}>Use library image</button>}
              {end.imageId && <button type="button" className={button} onClick={() => {
                if (!window.confirm("Remove this image from the drawing? The library image will remain.")) return;
                update({ ...draft, ends: draft.ends.map((item, i) => i === index && item.type === "CONNECTOR"
                  ? { ...item, imageId: undefined } : item) });
              }}>Remove drawing image</button>}
            </>;
          })()}
          <button type="button" className={button} onClick={() => {
            if (!window.confirm("Remove this end and any attached cables and their core assignments?")) return;
            update({ ...draft, ends: draft.ends.filter((_, i) => i !== index), segments: draft.segments
              .filter((segment) => segment.from !== index && segment.to !== index)
              .map((segment) => ({ ...segment, from: segment.from > index ? segment.from - 1 : segment.from, to: segment.to > index ? segment.to - 1 : segment.to })) });
          }}>Remove</button>
        </div>)}
      </section>
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">2. Add cables and connect their cores</h2>
        <p className="text-sm text-slate-600">Choose a cable and its two ends. For a splice, give every core joined together the same group name at that splice.</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-52 flex-1 text-sm">Cable
            <select className={field} value={stock} onChange={(event) => setStock(event.target.value)}>
              <option value="">Choose a cable</option>
              {cables.map((part) => <option key={part.id} value={part.id}>{part.name}{part.cores === null ? " (complete its definition first)" : ""}</option>)}
            </select>
          </label>
          <button type="button" className={button} disabled={draft.segments.length >= 32} onClick={() => {
            const part = cables.find((item) => item.id === stock);
            if (!part?.cores) { setError("Choose a cable with its cores set in the parts library."); return; }
            if (draft.ends.length < 2) { setError("Add at least two ends first."); return; }
            update({ ...draft, segments: [...draft.segments, { cableSpec: part.name, stockPartId: part.id, imageId: part.imageId ?? undefined, partNumber: part.partNumber ?? undefined, from: 0, to: 1, lengthMm: 0,
              cores: part.cores.map((core) => ({ ...core, spare: false, from: "", to: "" })) }] });
          }}>Add cable</button>
        </div>
        {draft.segments.map((segment, index) => <div key={index} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <div className="flex justify-between gap-2"><h3 className="font-semibold">Cable {index + 1}: {segment.cableSpec}</h3>
            <button type="button" className={button} onClick={() => {
              if (window.confirm("Remove this cable and its core assignments?")) update({ ...draft, segments: draft.segments.filter((_, i) => i !== index) });
            }}>Remove cable</button></div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const part = parts.find((item) => item.id === segment.stockPartId);
              return part && part.imageId !== (segment.imageId ?? null) && <button type="button" className={button} onClick={() => {
                if (segment.imageId && !window.confirm("Replace the image in this drawing with the current library image?")) return;
                updateSegment(index, { ...segment, imageId: part.imageId ?? undefined });
              }}>Use library image</button>;
            })()}
            {segment.imageId && <button type="button" className={button} onClick={() => {
              if (window.confirm("Remove this image from the drawing? The library image will remain.")) updateSegment(index, { ...segment, imageId: undefined });
            }}>Remove drawing image</button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["from", "to"] as const).map((side) => <label key={side} className="text-sm">{side === "from" ? "First end" : "Second end"}
              <select className={field} value={segment[side]} onChange={(event) => {
                if (segment.cores.some((core) => core[side]) && !window.confirm("Changing this end clears its core assignments. Continue?")) return;
                updateSegment(index, { ...segment, [side]: Number(event.target.value), cores: segment.cores.map((core) => ({ ...core, [side]: "" })) });
              }}>{draft.ends.map((end, i) => <option value={i} key={i}>End {i + 1}: {end.name}</option>)}</select>
            </label>)}
            <label className="text-sm">Cut length (mm)<input type="number" min={1} max={1000000} className={field}
              value={segment.lengthMm || ""} onChange={(event) => updateSegment(index, { ...segment, lengthMm: Number(event.target.value) })} /></label>
          </div>
          <div className="space-y-2">{segment.cores.map((core, coreIndex) => <div key={coreIndex} className="grid items-end gap-2 rounded bg-slate-50 p-3 sm:grid-cols-[minmax(120px,1fr)_1fr_1fr_auto]">
            <div className="text-sm"><strong>Core {coreIndex + 1}</strong><p>{coreColourDescription(core.colour, core.stripeColour)}</p></div>
            {(["from", "to"] as const).map((side) => {
              const end = draft.ends[segment[side]];
              const label = end?.type === "CONNECTOR" ? "Pin number" : end?.type === "SPLICE" ? "Splice group" : "Printed label";
              return <label key={side} className="text-sm">{end?.name}: {label}
                {end?.type === "CONNECTOR" ? <select className={field} disabled={core.spare} value={core[side]} onChange={(event) =>
                  updateSegment(index, { ...segment, cores: segment.cores.map((item, i) => i === coreIndex ? { ...item, [side]: event.target.value } : item) })}>
                  <option value="">Choose pin</option>{Array.from({ length: end.pinCount }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select> : <input className={field} disabled={core.spare} value={core[side]} maxLength={40} onChange={(event) =>
                  updateSegment(index, { ...segment, cores: segment.cores.map((item, i) => i === coreIndex ? { ...item, [side]: event.target.value } : item) })} />}
              </label>;
            })}
            <label className="flex gap-2 pb-2 text-sm"><input type="checkbox" checked={core.spare} onChange={(event) => {
              if (event.target.checked && (core.from || core.to) && !window.confirm("Marking this core spare clears its connections. Continue?")) return;
              updateSegment(index, { ...segment, cores: segment.cores.map((item, i) => i === coreIndex ? { ...item, spare: event.target.checked, from: "", to: "" } : item) });
            }} /> Spare</label>
          </div>)}</div>
        </div>)}
      </section>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {message && <p role="status" className="text-green-700">{message}</p>}
      <button type="button" disabled={pending} className="rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60" onClick={() => {
        if (!valid.success) { setError(valid.error.issues[0]?.message ?? "Complete the harness details."); return; }
        startTransition(async () => {
          try {
            const result = await saveCableWiring(id, valid.data);
            setError(result.error ?? ""); setMessage(result.message ?? "");
          } catch (error) {
            console.error("Could not save harness", error); setError("Could not save the harness. Please try again.");
          }
        });
      }}>{pending ? "Saving…" : "Save harness drawing"}</button>
      {valid.success && <div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => window.print()}>Print build sheet</button>
        {svg && <a className={button} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download="harness-build-sheet.svg">Download drawing</a>}</div>}
    </div>
    {valid.success && <section id="full-harness-sheet" className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Harness build sheet</p>
        <h2 className="break-words text-xl font-bold text-slate-900">{name}</h2>
        <p className="text-sm text-slate-600">{connectorPinTerminations(valid.data)} connector pin terminations · Print physical wire labels separately.</p>
      </header>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Harness ends</h3>
        <ul className="grid gap-2 sm:grid-cols-2">{valid.data.ends.map((end, i) => <li key={i} className="sheet-end rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">End {i + 1} · {end.type === "CONNECTOR" ? "Connector" : end.type === "SPLICE" ? "Splice" : "Bare wires"}</span>
          <span className="mt-1 block break-words font-semibold text-slate-900">{end.name}</span>
          {end.type === "CONNECTOR" && <span className="block text-slate-600">{end.pinCount} pins{end.partNumber ? ` · ${end.partNumber}` : ""}</span>}
        </li>)}</ul>
      </div>
      {svg && <div className="print:hidden">
        <h3 className="text-base font-semibold text-slate-900">Wiring diagram</h3>
        <p className="mb-3 mt-1 text-sm text-slate-600">Click a camera marker to view its image. Save the drawing to keep image changes.</p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <FullHarnessDrawing id={id} name={name} design={valid.data} svg={svg} hasHarnessImage={hasHarnessImage} />
        </div>
      </div>}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Wiring schedule</h3>
          <p className="mt-1 text-sm text-slate-600">Connections are listed for each cable core. Spare cores are not connected.</p>
        </div>
        {valid.data.segments.map((segment, index) => <div key={index} className="space-y-2">
          <h4 className="break-words font-semibold text-slate-900">Cable {index + 1}: {segment.cableSpec}{segment.partNumber ? ` (${segment.partNumber})` : ""} · {segment.lengthMm} mm</h4>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[34rem] text-left text-sm print:min-w-0">
              <thead className="bg-slate-100 text-slate-700"><tr>
                <th scope="col" className="px-3 py-2">Core</th>
                <th scope="col" className="px-3 py-2">End {segment.from + 1}: {valid.data.ends[segment.from].name}</th>
                <th scope="col" className="px-3 py-2">End {segment.to + 1}: {valid.data.ends[segment.to].name}</th>
              </tr></thead>
              <tbody>{segment.cores.map((core, i) => <tr key={i} className="border-t border-slate-200">
                <td className="px-3 py-2"><span aria-hidden="true" className="sheet-colour mr-2 inline-block h-3 w-6 border border-slate-500" style={{ backgroundColor: core.colour ?? "transparent", backgroundImage: core.stripeColour ? `repeating-linear-gradient(45deg, transparent 0 6px, ${core.stripeColour} 6px 10px)` : undefined }} />
                  {i + 1}: {coreColourDescription(core.colour, core.stripeColour)}</td>
                <td className="px-3 py-2">{core.spare ? "Spare" : description(valid.data.ends[segment.from], core.from)}</td>
                <td className="px-3 py-2">{core.spare ? "Not connected" : description(valid.data.ends[segment.to], core.to)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>)}
      </div>
    </section>}
    <style>{`@media print {
      body:has(#full-harness-sheet) *:not(:has(#full-harness-sheet)):not(#full-harness-sheet):not(#full-harness-sheet *) { display: none !important; }
      body:has(#full-harness-sheet) *:has(#full-harness-sheet) { display: block !important; position: static !important; width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
      #full-harness-sheet { display: block !important; width: 100%; color: #000; font-size: 11pt; }
      #full-harness-sheet h2 { font-size: 16pt; font-weight: bold; margin-bottom: 8pt; }
      #full-harness-sheet h3 { font-size: 13pt; margin-top: 12pt; }
      #full-harness-sheet h4 { font-size: 11pt; margin-top: 12pt; break-after: avoid; overflow-wrap: anywhere; }
      #full-harness-sheet .sheet-end { break-inside: avoid; overflow-wrap: anywhere; }
      #full-harness-sheet .sheet-colour { print-color-adjust: exact; }
      #full-harness-sheet table { width: 100%; border-collapse: collapse; margin: 8pt 0; table-layout: fixed; }
      #full-harness-sheet th, #full-harness-sheet td { border: 1px solid #444; padding: 6pt; text-align: left; overflow-wrap: anywhere; }
      #full-harness-sheet thead { display: table-header-group; }
      #full-harness-sheet tr { break-inside: avoid; }
    }`}</style>
  </div>;
}
