"use client";

import type { CablePartKind } from "@prisma/client";
import { useActionState, useState } from "react";
import { saveCablePart, type CableFormState } from "@/actions/admin/cable-making";
import { EditRecordDialog } from "@/components/admin/CableMakingForms";
import { CoreColourSelect } from "@/components/admin/CoreColourSelect";
import { cableAttachmentOptions, cableAttachmentSizeError } from "@/lib/cable-attachments";
import type { CablePartOption } from "@/lib/cable-parts";
import type { CoreColours } from "@/lib/core-colours";

const fieldClass = "mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2";

export function CablePartForm({ kind, part, onSaved }: { kind: CablePartKind; part?: CablePartOption; onSaved?: () => void }) {
  const [cores, setCores] = useState<CoreColours[]>(part?.cores ?? Array.from({ length: 4 }, () => ({})));
  const [state, action, pending] = useActionState(
    async (previous: CableFormState, data: FormData) => {
      const result = await saveCablePart(part?.id ?? null, previous, data);
      if (result.message) onSaved?.();
      return result;
    }, {},
  );
  const typeName = kind === "CONNECTOR" ? "connector" : "cable";
  return (
    <form action={action} className="max-w-2xl space-y-3 text-sm">
      <input type="hidden" name="kind" value={kind} />
      <label className="block">
        {kind === "CONNECTOR" ? "Connector" : "Cable"} name
        <input name="name" required maxLength={40} defaultValue={part?.name} className={fieldClass} />
      </label>
      <label className="block">
        Part number (optional)
        <input name="partNumber" maxLength={20} defaultValue={part?.partNumber ?? ""} className={fieldClass} />
      </label>
      {kind === "CONNECTOR" ? <label className="block">
        Number of pins
        <input name="pinCount" type="number" min={1} max={320} step={1} required defaultValue={part?.pinCount ?? ""} className={fieldClass} />
        <span className="mt-1 block text-slate-600">Pins are numbered from 1.</span>
      </label> : <>
        <input type="hidden" name="cores" value={JSON.stringify(cores)} />
        <label className="block">Number of cores
          <select className={fieldClass} value={cores.length} onChange={(event) => {
            const count = Number(event.target.value);
            if (count < cores.length && cores.slice(count).some((core) => core.colour || core.stripeColour) &&
              !window.confirm("Remove the extra cores and their colours?")) return;
            setCores(count <= cores.length ? cores.slice(0, count) : [...cores, ...Array.from({ length: count - cores.length }, () => ({}))]);
          }}>
            {Array.from({ length: 40 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        <p className="text-slate-600">Choose each core&apos;s colour and optional stripe. Leave a colour unspecified if it is not known.</p>
        {cores.map((core, index) => <div key={index} className="grid gap-3 rounded bg-slate-50 p-3 sm:grid-cols-2">
          <CoreColourSelect label={`Core ${index + 1} colour`} value={core.colour}
            onChange={(colour) => setCores(cores.map((item, i) => i === index ? { ...item, colour } : item))} />
          <CoreColourSelect label={`Core ${index + 1} stripe colour`} value={core.stripeColour}
            onChange={(stripeColour) => setCores(cores.map((item, i) => i === index ? { ...item, stripeColour } : item))} />
        </div>)}
      </>}
      <label className="block">
        Optional image (JPEG, PNG or WebP, up to 1 MB)
        <input type="file" name="image" accept={cableAttachmentOptions.IMAGE.accept} className={fieldClass}
          onChange={({ currentTarget: input }) => {
            input.setCustomValidity(cableAttachmentSizeError("IMAGE", input.files?.[0]?.size ?? 0) ?? "");
            input.reportValidity();
          }} />
      </label>
      {part?.imageId && <div className="space-y-2">
        <a className="text-blue-700 underline" target="_blank" rel="noreferrer"
          href={`/admin/cable-making/parts/${part.id}/images/${part.imageId}`}>View current image</a>
        <label className="flex items-center gap-2"><input type="checkbox" name="removeImage" /> Remove current image</label>
      </div>}
      {part && <p className="text-slate-600">Leave the image blank to keep it. A new image replaces it for future selections.</p>}
      {part && <p className="text-slate-600">Changes apply when this part is selected again; saved harnesses keep their existing details.</p>}
      {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-green-700">{state.message}</p>}
      <button disabled={pending} className="rounded bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : part ? "Save changes" : `Add ${typeName}`}
      </button>
    </form>
  );
}

export function EditCablePartButton({ part }: { part: CablePartOption }) {
  return <EditRecordDialog label={`Edit ${part.name}`} title={`Edit ${part.name}`}>
    {(close) => <CablePartForm kind={part.kind} part={part} onSaved={close} />}
  </EditRecordDialog>;
}
