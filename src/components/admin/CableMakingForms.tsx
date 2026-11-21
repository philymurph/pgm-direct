"use client";

import type { CableWorkLocation } from "@prisma/client";
import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import {
  deleteCableRecord,
  editCableWork,
  recordCableWork,
  saveCablePayment,
  saveCableType,
  type CableDeleteTarget,
  type CableFormState,
} from "@/actions/admin/cable-making";
import {
  cableAttachmentKinds,
  cableAttachmentOptions,
  cableAttachmentSizeError,
} from "@/lib/cable-attachments";
import { cableWorkLocationLabels } from "@/lib/cable-work-location";

const fieldClass = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const iconButtonClass = "inline-flex size-8 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";

function ActionIcon({ kind }: { kind: "edit" | "delete" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      {kind === "edit" ? (
        <path d="m15 6 3 3M5 19l4-1 10-10a2.1 2.1 0 0 0-3-3L6 15l-1 4Z" />
      ) : (
        <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
      )}
    </svg>
  );
}

function RecordDialog({
  label, title, children, add = false, busy = false, onOpen,
}: {
  label: string;
  title: string;
  children: (close: () => void) => ReactNode;
  add?: boolean;
  busy?: boolean;
  onOpen?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button type="button" aria-label={label} title={label}
        className={add
          ? "rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          : `${iconButtonClass} text-blue-700 hover:bg-blue-50`}
        onClick={() => { onOpen?.(); setOpen(true); }}>
        {add ? label : <ActionIcon kind="edit" />}
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)} onCancel={(event) => { if (busy) event.preventDefault(); }} aria-labelledby={headingId}
        className="m-auto max-h-[90vh] w-11/12 max-w-lg overflow-y-auto rounded-lg p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={headingId} className="break-all text-lg font-semibold">{title}</h2>
          <button type="button" onClick={close} disabled={busy} className="rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Close
          </button>
        </div>
        {open && children(close)}
      </dialog>
    </>
  );
}

export function EditRecordDialog({ label, title, children }: {
  label: string; title: string; children: (close: () => void) => ReactNode;
}) {
  return <RecordDialog label={label} title={title}>{children}</RecordDialog>;
}

export function AddRecordDialog({ label, children }: {
  label: string;
  children: (onSaved: (message: string) => void, onPendingChange: (pending: boolean) => void) => ReactNode;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="space-y-2">
    <RecordDialog label={label} title={label} add busy={busy} onOpen={() => setMessage("")}>
      {(close) => children((savedMessage) => { setBusy(false); setMessage(savedMessage); close(); }, setBusy)}
    </RecordDialog>
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
  </div>;
}

export function DeleteCableRecordButton({
  target, label, confirmation,
}: {
  target: CableDeleteTarget;
  label: string;
  confirmation: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        aria-label={pending ? `Deleting: ${label}` : label}
        title={label}
        className={`${iconButtonClass} text-red-700 hover:bg-red-50`}
        onClick={() => {
          if (!window.confirm(confirmation)) return;
          setError(undefined);
          startTransition(async () => {
            try {
              const result = await deleteCableRecord(target);
              setError(result.error);
            } catch (error) {
              console.error("Could not delete cable making record", error);
              setError("Could not delete the record. Please try again.");
            }
          });
        }}
      >
        <ActionIcon kind="delete" />
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

function LedgerForm({
  action, label, children, onSaved, onPendingChange,
}: {
  action: (state: CableFormState, data: FormData) => Promise<CableFormState>;
  label: string;
  children: ReactNode;
  onSaved?: (message: string) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    onSaved ? async (previous: CableFormState, data: FormData) => {
      const result = await action(previous, data);
      if (result.message) onSaved(result.message);
      return result;
    } : action,
    {},
  );
  useEffect(() => { onPendingChange?.(pending); }, [onPendingChange, pending]);

  return (
    <form action={formAction} className="space-y-3">
      {children}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
      <button type="submit" disabled={pending}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}

type EditableCableType = {
  id: string;
  name: string;
  pinsPerCable: number;
  pinCountFromDrawing: boolean;
  requiresDrawing: boolean;
  ratePerPin: string;
  attachments: { kind: (typeof cableAttachmentKinds)[number]; fileName: string }[];
};

export function CableTypeForm({ cable, onSaved, onPendingChange }: {
  cable?: EditableCableType; onSaved?: (message: string) => void; onPendingChange?: (pending: boolean) => void;
}) {
  return (
    <LedgerForm action={saveCableType.bind(null, cable?.id ?? null)}
      label={cable ? "Save changes" : "Add harness"} onSaved={onSaved} onPendingChange={onPendingChange}>
      <label className="block text-sm font-medium">
        Harness name
        <input name="name" required maxLength={100} defaultValue={cable?.name} className={fieldClass} />
      </label>
      {cable && !cable.requiresDrawing && <label className="block text-sm font-medium">
        Pin terminations per harness
        <input name="pinsPerCable" type="number" step={1} min={1} max={10000} required
          readOnly={cable?.pinCountFromDrawing} defaultValue={cable?.pinsPerCable} className={fieldClass} />
      </label>}
      {cable && !cable.requiresDrawing && <p className="text-sm text-slate-600">
        {cable?.pinCountFromDrawing
          ? "Calculated from mapped connector pins. Edit and save the harness drawing to change it."
          : "Enter a count for now. Saving a harness drawing replaces it with the number of mapped connector pins."}
        {" "}Bare-wire ends and splice points are not counted.
      </p>}
      {cable?.requiresDrawing && <input type="hidden" name="pinsPerCable" value={cable.pinsPerCable} />}
      {(!cable || cable.requiresDrawing) && <p className="text-sm text-slate-600">
        Pin terminations are calculated from the saved harness drawing. Save a drawing before recording work.
      </p>}
      <label className="block text-sm font-medium">
        Rate per pin termination (€)
        <input name="ratePerPin" type="number" step="0.01" min="0.01" max="9999.99" required
          defaultValue={cable?.ratePerPin ?? "1.00"} className={fieldClass} />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Optional attachments</legend>
        <p className="text-sm text-slate-600">
          {cable
            ? "Leave both file fields blank to keep any existing attachments."
            : "You can save the cable type without an image or PDF."}
        </p>
        {cableAttachmentKinds.map((kind) => {
          const { label, accept, maxMiB } = cableAttachmentOptions[kind];
          const existing = cable?.attachments.find((file) => file.kind === kind);
          return (
            <div key={kind} className="space-y-1">
              <label className="block text-sm">
                {label} (optional, up to {maxMiB} MB)
                <input
                  type="file"
                  name={kind}
                  accept={accept}
                  className={fieldClass}
                  onChange={({ currentTarget: input }) => {
                    input.setCustomValidity(cableAttachmentSizeError(kind, input.files?.[0]?.size ?? 0) ?? "");
                    input.reportValidity();
                  }}
                />
              </label>
              {cable && existing && (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <a className="break-all text-blue-700 underline" href={`/admin/cable-making/${cable.id}/attachments/${kind}`}>
                      Download {existing.fileName}
                    </a>
                    <DeleteCableRecordButton
                      target={{ type: "attachment", id: cable.id, kind }}
                      label={`Delete ${label}`}
                      confirmation={`Delete the attachment "${existing.fileName}"? This cannot be undone.`}
                    />
                  </div>
                  <p className="text-xs text-slate-600">Choosing a new file replaces the existing one.</p>
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
    </LedgerForm>
  );
}

export function EditCableTypeButton({ cable }: { cable: EditableCableType }) {
  return (
    <EditRecordDialog label="Edit cable type" title={`Edit ${cable.name}`}>
      {(close) => <CableTypeForm cable={cable} onSaved={close} />}
    </EditRecordDialog>
  );
}

export function AddCableTypeButton() {
  return <AddRecordDialog label="Add a harness">
    {(onSaved, onPendingChange) => <CableTypeForm onSaved={onSaved} onPendingChange={onPendingChange} />}
  </AddRecordDialog>;
}

type EditableCableWork = {
  id: string;
  cableName: string;
  completedOn: string;
  quantity: number;
  location: CableWorkLocation | null;
};

export function CableWorkForm({ cables, entry, onSaved, onPendingChange }: (
  { cables: { id: string; name: string }[]; entry?: never } |
  { entry: EditableCableWork; cables?: never }
) & { onSaved?: (message: string) => void; onPendingChange?: (pending: boolean) => void }) {
  return (
    <LedgerForm action={entry ? editCableWork.bind(null, entry.id) : recordCableWork}
      label={entry ? "Save changes" : "Record batch"} onSaved={onSaved} onPendingChange={onPendingChange}>
      <label className="block text-sm font-medium">
        Date completed
        <input name="completedOn" type="date" required defaultValue={entry?.completedOn} className={fieldClass} />
      </label>
      {cables && (
        <label className="block text-sm font-medium">
          Cable type
          <select name="cableTypeId" required defaultValue="" className={fieldClass}>
            <option value="" disabled>Choose a cable</option>
            {cables.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium">
        Location
        <select name="location" required defaultValue={entry?.location ?? ""} className={fieldClass}>
          <option value="" disabled>Choose a location</option>
          {Object.entries(cableWorkLocationLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Quantity completed
        <input name="quantity" type="number" step={1} min={1} max={100000} required
          defaultValue={entry?.quantity} className={fieldClass} />
      </label>
      {entry && <p className="text-sm text-slate-600">The original cable type, pin count, and rate are kept.</p>}
    </LedgerForm>
  );
}

export function AddCableWorkButton({ cables }: { cables: { id: string; name: string }[] }) {
  return <AddRecordDialog label="Record a completed batch">
    {(onSaved, onPendingChange) => <CableWorkForm cables={cables} onSaved={onSaved} onPendingChange={onPendingChange} />}
  </AddRecordDialog>;
}

export function EditCableWorkButton({ entry }: { entry: EditableCableWork }) {
  return (
    <EditRecordDialog label="Edit batch" title={`Edit batch: ${entry.cableName}`}>
      {(close) => <CableWorkForm entry={entry} onSaved={close} />}
    </EditRecordDialog>
  );
}

type EditableCablePayment = { id: string; paidOn: string; amount: string; reference: string | null };

export function CablePaymentForm({ entry, onSaved, onPendingChange }: {
  entry?: EditableCablePayment; onSaved?: (message: string) => void; onPendingChange?: (pending: boolean) => void;
}) {
  return (
    <LedgerForm action={saveCablePayment.bind(null, entry?.id ?? null)}
      label={entry ? "Save changes" : "Record payment"} onSaved={onSaved} onPendingChange={onPendingChange}>
      <label className="block text-sm font-medium">
        Payment date
        <input name="paidOn" type="date" required defaultValue={entry?.paidOn} className={fieldClass} />
      </label>
      <label className="block text-sm font-medium">
        Amount paid (€)
        <input name="amount" type="number" step="0.01" min="0.01" max="9999999999.99" required
          defaultValue={entry?.amount} className={fieldClass} />
      </label>
      <label className="block text-sm font-medium">
        Reference or note (optional)
        <input name="reference" maxLength={250} defaultValue={entry?.reference ?? undefined} className={fieldClass} />
      </label>
    </LedgerForm>
  );
}

export function AddCablePaymentButton() {
  return <AddRecordDialog label="Record a payment">
    {(onSaved, onPendingChange) => <CablePaymentForm onSaved={onSaved} onPendingChange={onPendingChange} />}
  </AddRecordDialog>;
}

export function EditCablePaymentButton({ entry }: { entry: EditableCablePayment }) {
  return (
    <EditRecordDialog label="Edit payment" title="Edit payment">
      {(close) => <CablePaymentForm entry={entry} onSaved={close} />}
    </EditRecordDialog>
  );
}
