import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CableAttachmentPreviews } from "@/components/admin/CableAttachmentPreviews";
import { CableMakingNav } from "@/components/admin/CableMakingNav";
import { FullHarnessDrawing } from "@/components/admin/FullHarnessDrawing";
import { LegacyCableMakingLinks } from "@/components/admin/LegacyCableMakingLinks";
import {
  AddCablePaymentButton,
  AddCableTransferButton,
  AddCableTypeButton,
  AddCableWorkButton,
  DeleteCableRecordButton,
  EditCablePaymentButton,
  EditCableTypeButton,
  EditCableWorkButton,
} from "@/components/admin/CableMakingForms";
import { getSession } from "@/lib/auth";
import { cableBalance } from "@/lib/cable-making";
import { cableWorkLocationLabels, summarizeCableWorkByLocation } from "@/lib/cable-work-location";
import { CABLE_WIRING_WIDTH } from "@/lib/cable-wiring";
import { prisma } from "@/lib/db";
import { formatEuro, toDecimal } from "@/lib/money";
import { savedHarnessDrawing } from "@/lib/saved-harness-drawing";

const numbers = new Intl.NumberFormat("en-IE");
const dates = new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeZone: "UTC" });
const transferDates = new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function Panel({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function LedgerTable({ headings, children }: { headings: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-2 [&_td]:py-2">
        <thead className="border-b border-slate-200 text-xs text-slate-600">
          <tr>{headings.map((label) => <th key={label} scope="col" className="px-2 py-2">{label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export default async function CableMakingPage({ searchParams }: {
  searchParams: Promise<{ section?: string | string[]; q?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");
  const params = await searchParams;
  const section = params.section === "harnesses" || params.section === "work" || params.section === "payments"
    ? params.section : "overview";
  const search = typeof params.q === "string" ? params.q.trim() : "";

  const [cables, work, payments, transfers] = await prisma.$transaction([
    prisma.cableType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, pinsPerCable: true, pinCountFromDrawing: true, requiresDrawing: true, ratePerPin: true, wiringDesign: true, attachments: { select: { kind: true, fileName: true } } },
    }),
    prisma.cableWork.findMany({ orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }] }),
    prisma.cablePayment.findMany({ orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }] }),
    prisma.cableTransfer.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ], { isolationLevel: "RepeatableRead" });

  const earned = work.reduce((total, row) => total.plus(row.earned), toDecimal(0));
  const paid = payments.reduce((total, row) => total.plus(row.amount), toDecimal(0));
  const balance = cableBalance(earned, paid);
  const locationSummary = summarizeCableWorkByLocation(work, transfers);
  const transferableCables = [...new Set(locationSummary.flatMap((group) =>
    group.location ? group.cables.filter((cable) => cable.quantity > 0).map((cable) => cable.name) : []))]
    .sort((a, b) => a.localeCompare(b, "en-IE"));
  const matchingCables = cables.filter((cable) => cable.name.toLowerCase().includes(search.toLowerCase()));
  const summary = [
    { label: "Cables made", value: numbers.format(work.reduce((total, row) => total + row.quantity, 0)) },
    { label: "Pin terminations", value: numbers.format(work.reduce((total, row) => total + row.totalPins, BigInt(0))) },
    { label: "Total earned", value: formatEuro(earned) },
    { label: "Total paid", value: formatEuro(paid) },
    { label: balance.lt(0) ? "Overpaid" : "Balance to pay", value: formatEuro(balance.abs()) },
  ];

  return (
    <div className="space-y-6">
      <LegacyCableMakingLinks />
      <header className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin workspace</p>
        <h1 className="text-2xl font-bold text-slate-900">Cable Making</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Define connectors and cables, assemble harnesses, then record completed work and payments.</p>
        <div className="mt-4"><CableMakingNav active={section} /></div>
      </header>

      {section === "overview" && <>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summary.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium text-slate-600">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <Panel id="completed-by-location" title="Cables by location"
        description="Completed quantities adjusted for recorded transfers, grouped by the recorded cable name. Sales and other removals are not tracked, so this is not a current stock count.">
        {transferableCables.length > 0 && <AddCableTransferButton cables={transferableCables} />}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {locationSummary.map((group) => (
            <section key={group.location ?? "not-set"} aria-label={`${group.label} recorded cables`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{group.label}</h3>
                <span className="text-sm font-medium text-slate-600">{numbers.format(group.total)} recorded</span>
              </div>
              {group.cables.length ? <ul className="mt-3 divide-y divide-slate-200 text-sm">
                {group.cables.map((cable) => <li key={cable.name} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 break-words text-slate-700">{cable.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{numbers.format(cable.quantity)}</span>
                </li>)}
              </ul> : <p className="mt-3 text-sm text-slate-600">No completed cables recorded.</p>}
            </section>
          ))}
        </div>
        <Link href="/admin/cable-making?section=work" className="inline-block text-sm font-medium text-blue-700 underline">View work log</Link>
        {transfers.length > 0 && <div className="space-y-2">
          <h3 className="font-semibold text-slate-900">Transfer history</h3>
          <LedgerTable headings={["Recorded (UTC)", "Cable", "From", "To", "Quantity", "Recorded by", "Actions"]}>
            {transfers.map((transfer) => <tr key={transfer.id}>
              <td>{transferDates.format(transfer.createdAt)}</td>
              <td className="break-words">{transfer.cableName}</td>
              <td>{cableWorkLocationLabels[transfer.fromLocation]}</td>
              <td>{cableWorkLocationLabels[transfer.toLocation]}</td>
              <td>{numbers.format(transfer.quantity)}</td>
              <td className="break-all">{transfer.actorEmail}</td>
              <td><DeleteCableRecordButton target={{ type: "transfer", id: transfer.id }}
                label={`Delete transfer of ${numbers.format(transfer.quantity)} ${transfer.cableName} from ${cableWorkLocationLabels[transfer.fromLocation]} to ${cableWorkLocationLabels[transfer.toLocation]}, recorded ${transferDates.format(transfer.createdAt)} UTC`}
                confirmation={`Delete this transfer of ${numbers.format(transfer.quantity)} "${transfer.cableName}" from ${cableWorkLocationLabels[transfer.fromLocation]} to ${cableWorkLocationLabels[transfer.toLocation]}? This reverses the recorded location quantities, but does not physically move the cables.`} /></td>
            </tr>)}
          </LedgerTable>
        </div>}
      </Panel>
      </>}

      {section === "harnesses" && <Panel id="cable-types" title="Harnesses" description="Add a harness, then choose its connectors and cables in Harness Creator. Rate changes apply only to new work.">
          <div className="flex flex-wrap gap-3 text-sm"><Link className="text-blue-700 underline" href="/admin/cable-making/parts#connectors">Manage connectors</Link><Link className="text-blue-700 underline" href="/admin/cable-making/parts#cables">Manage cables</Link></div>
          <AddCableTypeButton />
          {cables.length > 0 && <form action="/admin/cable-making" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="section" value="harnesses" />
            <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Search harnesses
              <input type="search" name="q" defaultValue={search} placeholder="Search by harness name"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" />
            </label>
            <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Search</button>
            {search && <Link href="/admin/cable-making?section=harnesses" className="px-2 py-2 text-sm font-medium text-blue-700 underline">Clear</Link>}
          </form>}
          {cables.length === 0 ? <p className="text-sm text-slate-600">No harnesses yet. Add one to create a drawing.</p> : matchingCables.length === 0
            ? <p className="text-sm text-slate-600">No harnesses match your search.</p> : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
          {matchingCables.map((cable) => {
            const drawing = savedHarnessDrawing(cable.name, cable.wiringDesign);
            const image = drawing?.success ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.svg)}` : null;
            return (
            <div key={cable.id} className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-slate-900">{cable.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{cable.requiresDrawing && !cable.pinCountFromDrawing ? "Drawing required before recording work" : `${numbers.format(cable.pinsPerCable)} pin terminations per harness${cable.pinCountFromDrawing ? " · from saved drawing" : " · manually entered"}`} · {formatEuro(cable.ratePerPin)} per termination</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EditCableTypeButton cable={{ id: cable.id, name: cable.name, pinsPerCable: cable.pinsPerCable,
                    pinCountFromDrawing: cable.pinCountFromDrawing, requiresDrawing: cable.requiresDrawing,
                    ratePerPin: cable.ratePerPin.toFixed(2), attachments: cable.attachments }} />
                  <DeleteCableRecordButton
                    target={{ type: "cable", id: cable.id }}
                    label="Delete cable type"
                    confirmation={`Delete "${cable.name}" and its attachments? Previously recorded work and earnings will be kept.`}
                  />
                </div>
              </div>
              <Link href={`/admin/cable-making/${cable.id}/creator`} className="inline-block rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                Open Harness Creator
              </Link>
              {drawing && (drawing.success && image ? <details>
                <summary className="group cursor-pointer list-none rounded-lg border border-slate-200 bg-slate-50 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                  <div className="relative h-36 overflow-hidden rounded border border-slate-200 bg-white">
                    <Image unoptimized fill src={image} alt={`${cable.name} saved wiring drawing preview`}
                      sizes="(min-width: 1024px) 40vw, 90vw" className="object-contain" />
                  </div>
                  <span className="mt-2 block text-sm font-semibold text-blue-700 group-hover:underline">
                    View full drawing
                  </span>
                </summary>
                <div className="mt-2 max-h-96 overflow-auto rounded-md border border-slate-200" tabIndex={0} aria-label={`${cable.name} saved drawing, scrollable`}>
                  {drawing.design.version === 4
                    ? <FullHarnessDrawing id={cable.id} name={cable.name} design={drawing.design} svg={drawing.svg}
                      hasHarnessImage={cable.attachments.some((attachment) => attachment.kind === "IMAGE")} />
                    : <Image unoptimized src={image}
                      alt={`${cable.name} saved wiring drawing`} width={CABLE_WIRING_WIDTH} height={100}
                      className="block h-auto w-full min-w-[700px]" />}
                </div>
              </details> : <p role="alert" className="text-sm text-red-700">This saved drawing could not be loaded. It has not been changed.</p>)}
              {!drawing && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No drawing saved yet.</p>}
              {cable.attachments.length > 0 && (
                <CableAttachmentPreviews cableId={cable.id} cableName={cable.name} attachments={cable.attachments} />
              )}
            </div>
          ); })}
          </div>)}
      </Panel>}

      {section === "work" && <Panel id="work-log" title="Work log" description="Record finished batches. The pin count and rate are saved with each batch.">
        {cables.some((cable) => !cable.requiresDrawing || cable.pinCountFromDrawing)
          ? <AddCableWorkButton cables={cables.filter((cable) => !cable.requiresDrawing || cable.pinCountFromDrawing).map(({ id, name }) => ({ id, name }))} />
          : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Add a <Link href="/admin/cable-making?section=harnesses" className="font-medium text-blue-700 underline">harness</Link> and save its drawing before recording a batch.</p>}
        {work.length ? (
          <LedgerTable headings={["Completed", "Cable", "Location", "Quantity", "Terminations per harness", "Total terminations", "Rate per termination", "Earned", "Actions"]}>
            {work.map((row) => (
              <tr key={row.id}>
                <td>{dates.format(row.completedOn)}</td>
                <td>{row.cableName}</td>
                <td>{row.location ? cableWorkLocationLabels[row.location] : "Not set"}</td>
                <td>{numbers.format(row.quantity)}</td>
                <td>{numbers.format(row.pinsPerCable)}</td>
                <td>{numbers.format(row.totalPins)}</td>
                <td>{formatEuro(row.ratePerPin)}</td>
                <td>{formatEuro(row.earned)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <EditCableWorkButton entry={{
                      id: row.id,
                      cableName: row.cableName,
                      completedOn: row.completedOn.toISOString().slice(0, 10),
                      quantity: row.quantity,
                      location: row.location,
                    }} />
                    <DeleteCableRecordButton
                      target={{ type: "work", id: row.id }}
                      label="Delete batch"
                      confirmation={`Delete the "${row.cableName}" batch completed on ${dates.format(row.completedOn)}? This removes ${formatEuro(row.earned)} from total earned.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </LedgerTable>
        ) : <p className="text-sm text-slate-600">No completed batches recorded yet.</p>}
      </Panel>}

      {section === "payments" && <Panel id="payments" title="Payments" description="Keep a record of money already paid. Recording a payment does not send money.">
        <AddCablePaymentButton />
        {payments.length ? (
          <LedgerTable headings={["Paid", "Amount", "Reference or note", "Actions"]}>
            {payments.map((row) => (
              <tr key={row.id}>
                <td>{dates.format(row.paidOn)}</td>
                <td>{formatEuro(row.amount)}</td>
                <td className="break-all">{row.reference ?? "—"}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <EditCablePaymentButton entry={{
                      id: row.id,
                      paidOn: row.paidOn.toISOString().slice(0, 10),
                      amount: row.amount.toFixed(2),
                      reference: row.reference,
                    }} />
                    <DeleteCableRecordButton
                      target={{ type: "payment", id: row.id }}
                      label="Delete payment"
                      confirmation={`Delete the ${formatEuro(row.amount)} payment record from ${dates.format(row.paidOn)}? This updates the balance but does not reverse the actual payment.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </LedgerTable>
        ) : <p className="text-sm text-slate-600">No payments recorded yet.</p>}
      </Panel>}
    </div>
  );
}
