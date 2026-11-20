"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { saveCableWiring } from "@/actions/admin/cable-making";
import { CablePinDiagram } from "@/components/admin/CablePinDiagram";
import { SimpleHarnessCreator } from "@/components/admin/SimpleHarnessCreator";
import { FullHarnessCreator } from "@/components/admin/FullHarnessCreator";
import type { CablePartOption } from "@/lib/cable-parts";
import {
  CABLE_WIRING_WIDTH, harnessWiringSchema, cableWiringSvg, connectorPinTerminations, endLetter, MAX_CONNECTIONS, MAX_ENDPOINTS, MAX_SEGMENTS, MAX_TERMINALS,
  sameCableTerminal, type CableTerminal, type CableWiring, type SavedCableWiring, type SimpleHarness,
} from "@/lib/cable-wiring";

const field = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const secondary = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const blankEnd = (type: CableWiring["ends"][number]["type"] = "CONNECTOR") => ({ type, name: "" });
const blankSegment = (from = -1, to = -1) => ({ cableSpec: "", from, to, lengthMm: 0 });
const blankConnection = (index: number) => ({
  label: `Wire ${index + 1}`,
  terminals: [{ end: 0, pin: "" }, { end: 1, pin: "" }],
});

function PartPicker({ label, parts, selected, onChange }: {
  label: string;
  parts: CablePartOption[];
  selected?: string;
  onChange: (part: CablePartOption | undefined) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select className={field} value={selected ?? ""}
        onChange={(event) => onChange(parts.find(({ id }) => id === event.target.value))}>
        <option value="">Custom / no library part</option>
        {parts.map(({ id, name, partNumber }) => (
          <option key={id} value={id}>{name}{partNumber && ` · ${partNumber}`}</option>
        ))}
      </select>
    </label>
  );
}

export function CableCreator({ id, name, initial, parts, hasHarnessImage }: {
  id: string; name: string; initial?: SavedCableWiring; parts: CablePartOption[]; hasHarnessImage: boolean;
}) {
  const [advanced, setAdvanced] = useState(initial?.version === 2);
  const [replace, setReplace] = useState(false);
  if (!initial || initial.version === 4 || replace) {
    return <FullHarnessCreator id={id} name={name} initial={initial?.version === 4 ? initial : undefined} parts={parts} hasHarnessImage={hasHarnessImage} />;
  }
  const replaceButton = <button type="button" className="mb-4 text-sm font-semibold text-blue-700 underline print:hidden" onClick={() => {
    if (window.confirm("Start a new harness using current part definitions? Existing wiring will not be copied. Saving the new harness will replace this drawing.")) setReplace(true);
  }}>Create a new multi-cable harness instead</button>;
  if (advanced) {
    return <>
      {replaceButton}
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
        <p>This advanced drawing does not assign cable cores or printed wire labels.</p>
        <button type="button" className="mt-2 font-semibold text-blue-700 underline" onClick={() => {
          if (window.confirm("Start a simple connector-to-bare-wires build sheet? Existing wiring will not be copied. Saving it will replace this drawing.")) setAdvanced(false);
        }}>Create a simple build sheet instead</button>
      </div>
      <AdvancedCableCreator id={id} name={name} initial={initial?.version === 2 ? initial : undefined} parts={parts} />
    </>;
  }
  const previous = initial?.version === 2 && initial.ends.length === 2 && initial.ends[0].type === "CONNECTOR" &&
    initial.ends[1].type === "BARE" && initial.segments.length === 1 ? initial : undefined;
  const simpleInitial: SimpleHarness | undefined = initial?.version === 3 ? initial : previous ? {
    version: 3,
    ends: [{ type: "CONNECTOR", name: previous.ends[0].name, partId: previous.ends[0].partId, pinCount: 0 },
      { type: "BARE", name: "Bare wires" }],
    segments: [{ cableSpec: previous.segments[0].cableSpec, stockPartId: previous.segments[0].stockPartId,
      from: 0, to: 1, lengthMm: previous.segments[0].lengthMm }],
    cores: Array.from({ length: 4 }, (_, index) => ({ core: `Core ${index + 1}`, spare: false, pin: "", printedLabel: "" })),
  } : undefined;
  return <>{replaceButton}<SimpleHarnessCreator id={id} name={name} initial={simpleInitial} parts={parts}
    onAdvanced={initial?.version !== 3 ? () => {
      if (window.confirm("Switch to the advanced creator? Any unsaved entries on this page will be lost.")) setAdvanced(true);
    } : undefined} /></>;
}

function AdvancedCableCreator({ id, name, initial, parts }: {
  id: string; name: string; initial?: CableWiring; parts: CablePartOption[];
}) {
  const [draft, setDraft] = useState<CableWiring>(initial ?? {
    version: 2, ends: [blankEnd(), blankEnd("BARE")], segments: [blankSegment(0, 1)], connections: [blankConnection(0)],
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [extraPins, setExtraPins] = useState<CableTerminal[]>([]);
  const [pending, startTransition] = useTransition();
  const stock = parts.filter(({ kind }) => kind === "CABLE_STOCK");
  const connectors = parts.filter(({ kind }) => kind === "CONNECTOR");
  const valid = harnessWiringSchema.safeParse(draft);
  const terminations = valid.success ? connectorPinTerminations(valid.data) : null;
  const svg = valid.success ? cableWiringSvg(name, valid.data) : null;
  const image = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;

  const update = (next: CableWiring) => {
    setMessage("");
    setError("");
    setExtraPins((pins) => pins.filter((pin) => !next.connections.some((connection) =>
      connection.terminals.some((terminal) => terminal.pin.trim() && sameCableTerminal(pin, terminal)))));
    setDraft(next);
  };
  function updateConnection(index: number, entry: CableWiring["connections"][number]) {
    update({ ...draft, connections: draft.connections.map((item, i) => i === index ? entry : item) });
  }
  function removeEnd(index: number) {
    const ends = draft.ends.filter((_, i) => i !== index);
    if (!window.confirm(`Remove endpoint ${endLetter(index)}?`)) return;
    setExtraPins((pins) => pins.filter((pin) => pin.end !== index)
      .map((pin) => ({ ...pin, end: pin.end > index ? pin.end - 1 : pin.end })));
    update({
      ...draft,
      ends,
      segments: draft.segments.map((segment) => ({
        ...segment,
        from: segment.from > index ? segment.from - 1 : segment.from,
        to: segment.to > index ? segment.to - 1 : segment.to,
      })),
      connections: draft.connections.map((item) => ({
        ...item,
        terminals: item.terminals.map((terminal) => ({
          ...terminal, end: terminal.end > index ? terminal.end - 1 : terminal.end,
        })),
      })),
    });
  }

  return (
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <form className="space-y-5 print:hidden" onSubmit={(event) => {
        event.preventDefault();
        if (!valid.success) {
          const issue = valid.error.issues[0];
          setError(`${issue.path.join(" → ")}: ${issue.message}`);
          return;
        }
        if (terminations === 0) {
          setError("Map at least one connector pin before saving the drawing.");
          return;
        }
        startTransition(async () => {
          try {
            const result = await saveCableWiring(id, valid.data);
            setError(result.error ?? "");
            setMessage(result.message ?? "");
          } catch (error) {
            console.error("Could not save cable wiring", error);
            setError("Could not save the drawing. Please try again.");
          }
        });
      }}>
        <fieldset disabled={pending} className="space-y-5">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 1</p>
              <h2 className="text-lg font-semibold">Harness endpoints</h2>
            </div>
            <p className="text-sm text-slate-600">
              Add at least one connector. Other endpoints can be connectors, bare wires or branch / splice points.
              Remove an endpoint from its cable segments and wiring before deleting it.
            </p>
            {draft.ends.map((end, index) => {
              const inUse = draft.connections.some(({ terminals }) => terminals.some((pin) => pin.end === index)) ||
                draft.segments.some((segment) => segment.from === index || segment.to === index);
              const endName = `Endpoint ${endLetter(index)}`;
              return (
                <div key={index} className="grid items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                  <label className="text-sm">{endName} type
                    <select className={field} value={end.type} onChange={(event) => {
                      const type = event.target.value;
                      if (type !== "CONNECTOR" && type !== "BARE" && type !== "SPLICE") return;
                      update({ ...draft, ends: draft.ends.map((item, i) => i === index
                        ? { ...item, type, partId: type === "CONNECTOR" ? item.partId : undefined }
                        : item) });
                    }}>
                      <option value="CONNECTOR">Connector</option>
                      <option value="BARE">Bare wires</option>
                      <option value="SPLICE">Branch / splice</option>
                    </select>
                  </label>
                  <label className="text-sm">{endName} name
                    <input className={field} value={end.name} maxLength={40} required
                      placeholder={end.type === "BARE" ? "e.g. Loose wires" : end.type === "SPLICE" ? "e.g. Main branch" : "e.g. Plug A"}
                      onChange={(e) => update({ ...draft, ends: draft.ends.map((item, i) => i === index ? { ...end, name: e.target.value } : item) })} />
                  </label>
                  {end.type === "CONNECTOR" && <div className="sm:col-span-full">
                    <PartPicker label={`${endName} connector from Parts library`} parts={connectors} selected={end.partId}
                      onChange={(part) => update({
                        ...draft,
                        ends: draft.ends.map((item, i) => i === index
                          ? { ...item, partId: part?.id, name: part?.name ?? item.name }
                          : item),
                      })} />
                  </div>}
                  {draft.ends.length > 2 && (
                    <button className={`${secondary} sm:col-span-full sm:justify-self-start`} type="button" disabled={inUse} onClick={() => removeEnd(index)}
                      title={inUse ? "Remove this endpoint from its cable segments and wiring first" : undefined}
                      aria-label={`Remove ${endName}`}>Remove</button>
                  )}
                </div>
              );
            })}
            <button type="button" className={secondary} disabled={draft.ends.length >= MAX_ENDPOINTS}
              onClick={() => update({ ...draft, ends: [...draft.ends, blankEnd()] })}>Add endpoint</button>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 2</p>
              <h2 className="text-lg font-semibold">Cable segments</h2>
            </div>
            <p className="text-sm text-slate-600">For each cable, choose its two endpoints and enter its type and cut length. Use a branch / splice endpoint to join segments.</p>
            {draft.segments.map((segment, index) => {
              const updateSegment = (change: Partial<typeof segment>) => update({
                ...draft, segments: draft.segments.map((item, i) => i === index ? { ...item, ...change } : item),
              });
              return <div key={index} className="space-y-3 rounded-lg bg-slate-50 p-3">
                <h3 className="font-semibold">Cable {index + 1}</h3>
                <PartPicker label={`Cable ${index + 1} stock from Parts library (optional)`} parts={stock} selected={segment.stockPartId}
                  onChange={(part) => updateSegment({ stockPartId: part?.id, cableSpec: part ? part.name : segment.cableSpec })} />
                <label className="block text-sm">Cable {index + 1} specification
                  <input className={field} value={segment.cableSpec} maxLength={64} required placeholder="e.g. 4-core shielded cable"
                    onChange={(event) => updateSegment({ cableSpec: event.target.value })} />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["from", "to"] as const).map((side) => <label key={side} className="text-sm">
                    Cable {index + 1} {side === "from" ? "from" : "to"}
                    <select className={field} value={segment[side]} required
                      onChange={(event) => updateSegment({ [side]: Number(event.target.value) })}>
                      <option value={-1} disabled>Choose endpoint</option>
                      {draft.ends.map((end, i) => <option key={i} value={i}>{endLetter(i)}{end.name && ` — ${end.name}`}</option>)}
                    </select>
                  </label>)}
                  <label className="text-sm">Cable {index + 1} length (mm)
                    <input className={field} type="number" min={1} max={1_000_000} step={1} required value={segment.lengthMm || ""}
                      onChange={(event) => updateSegment({ lengthMm: Number(event.target.value) })} />
                  </label>
                </div>
                {draft.segments.length > 1 && <button className={secondary} type="button"
                  onClick={() => {
                    if (window.confirm(`Remove cable ${index + 1}?`))
                      update({ ...draft, segments: draft.segments.filter((_, i) => i !== index) });
                  }}>Remove cable {index + 1}</button>}
              </div>;
            })}
            <button type="button" className={secondary} disabled={draft.segments.length >= MAX_SEGMENTS}
              onClick={() => update({ ...draft, segments: [...draft.segments, blankSegment()] })}>Add cable segment</button>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Step 3</p>
              <h2 className="text-lg font-semibold">Pin wiring</h2>
            </div>
            <p className="text-sm text-slate-600">Advanced editor: group electrically connected pins or wire ends. Add more than two to show a split. Connections do not assign individual cores or printed wire labels.</p>
            <p className="text-sm text-slate-600">
              {terminations === null ? "Complete the drawing to calculate pin terminations." : `${terminations} mapped connector pin termination${terminations === 1 ? "" : "s"} per harness.`}
              {" "}Saving updates the count for new work; bare-wire ends and splice points are not counted. Existing batches are unchanged.
            </p>
            <CablePinDiagram key={draft.ends.length} design={draft} extraPins={extraPins}
              onExtraPinsChange={setExtraPins} onChange={update} disabled={pending} />
            <h3 className="pt-2 font-semibold text-slate-900">Connection details</h3>
            <p className="text-sm text-slate-600">Rename or manually edit the connections here. Changes also update the diagram.</p>
            {draft.connections.map((item, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="block text-sm">Connection {index + 1} label
                  <input className={field} value={item.label} maxLength={40} required placeholder="e.g. Blue or Signal 1"
                    onChange={(e) => updateConnection(index, { ...item, label: e.target.value })} />
                </label>
                {item.terminals.map((terminal, pinIndex) => {
                  function updateTerminal(next: typeof terminal) {
                    updateConnection(index, { ...item, terminals: item.terminals.map((pin, i) => i === pinIndex ? next : pin) });
                  }
                  return (
                    <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]" key={pinIndex}>
                      <label className="text-sm">Pin {pinIndex + 1} endpoint
                        <select className={field} value={terminal.end} onChange={(e) => updateTerminal({ ...terminal, end: Number(e.target.value) })}>
                          {draft.ends.map((end, i) => <option key={i} value={i}>{endLetter(i)}{end.name && ` — ${end.name}`}</option>)}
                        </select>
                      </label>
                      <label className="text-sm">Pin {pinIndex + 1} label
                        <input className={field} value={terminal.pin} maxLength={16} required placeholder="e.g. 1 or A2"
                          onChange={(e) => updateTerminal({ ...terminal, pin: e.target.value })} />
                      </label>
                      {item.terminals.length > 2 && <button className={secondary} type="button"
                        onClick={() => {
                          if (window.confirm(`Remove pin ${pinIndex + 1} from connection ${index + 1}?`))
                            updateConnection(index, { ...item, terminals: item.terminals.filter((_, i) => i !== pinIndex) });
                        }}>Remove pin {pinIndex + 1}</button>}
                    </div>
                  );
                })}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} disabled={item.terminals.length >= MAX_TERMINALS}
                    onClick={() => updateConnection(index, { ...item, terminals: [...item.terminals, { end: 0, pin: "" }] })}>Add pin to connection {index + 1}</button>
                  {draft.connections.length > 1 && <button type="button" className={secondary}
                    onClick={() => {
                      if (window.confirm(`Remove connection ${index + 1} and its pins?`))
                        update({ ...draft, connections: draft.connections.filter((_, i) => i !== index) });
                    }}>Remove connection {index + 1}</button>}
                </div>
              </div>
            ))}
            <button type="button" className={secondary} disabled={draft.connections.length >= MAX_CONNECTIONS}
              onClick={() => update({ ...draft, connections: [...draft.connections, blankConnection(draft.connections.length)] })}>Add connection</button>
          </section>

          <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {pending ? "Saving…" : "Save drawing"}
          </button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      </form>

      <section className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:overflow-visible print:border-0 print:p-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto" id="cable-wiring-preview">
        <div className="print:hidden">
          <h2 className="text-lg font-semibold">Drawing preview</h2>
          <p className="mt-1 text-sm text-slate-600">The preview updates as you edit. Save the drawing to keep your changes.</p>
        </div>
        {image ? (
          <>
            <div className="flex flex-wrap gap-2 print:hidden">
              <a href={image} download="cable-wiring.svg" className={secondary}>Download SVG</a>
              <button type="button" className={secondary} onClick={() => window.print()}>Print drawing</button>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <Image unoptimized loading="eager" src={image} alt={`Cable layout and pin wiring for ${name}`} width={CABLE_WIRING_WIDTH} height={100}
                className="h-auto w-full min-w-[700px] max-w-[840px] border border-slate-200 print:min-w-0 print:border-0" />
            </div>
            <style>{`@media print {
              body:has(#cable-wiring-preview) * { visibility: hidden; }
              body:has(#cable-wiring-preview) #cable-wiring-preview img { visibility: visible; position: absolute; inset: 0 auto auto 0; width: 100%; max-width: none; max-height: 240mm; object-fit: contain; object-position: top; }
            }`}</style>
          </>
        ) : <p className="text-sm text-slate-600">Complete the endpoints, cable segments and pin wiring to preview the drawing.</p>}
      </section>
    </div>
  );
}
