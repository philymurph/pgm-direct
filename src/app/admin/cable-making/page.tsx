import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CableAttachmentPreviews } from "@/components/admin/CableAttachmentPreviews";
import { FullHarnessDrawing } from "@/components/admin/FullHarnessDrawing";
import {
  CablePaymentForm,
  CableTypeForm,
  CableWorkForm,
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

function AddForm({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer font-semibold text-blue-700 hover:text-blue-900">{title}</summary>
      <div className="mt-4 max-w-xl">{children}</div>
    </details>
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

export default async function CableMakingPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");

  const [cables, work, payments] = await prisma.$transaction([
    prisma.cableType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, pinsPerCable: true, pinCountFromDrawing: true, requiresDrawing: true, ratePerPin: true, wiringDesign: true, attachments: { select: { kind: true, fileName: true } } },
    }),
    prisma.cableWork.findMany({ orderBy: [{ completedOn: "desc" }, { createdAt: "desc" }] }),
    prisma.cablePayment.findMany({ orderBy: [{ paidOn: "desc" }, { createdAt: "desc" }] }),
  ], { isolationLevel: "RepeatableRead" });

  const earned = work.reduce((total, row) => total.plus(row.earned), toDecimal(0));
  const paid = payments.reduce((total, row) => total.plus(row.amount), toDecimal(0));
  const balance = cableBalance(earned, paid);
  const locationSummary = summarizeCableWorkByLocation(work);
  const summary = [
    { label: "Cables made", value: numbers.format(work.reduce((total, row) => total + row.quantity, 0)) },
    { label: "Pin terminations", value: numbers.format(work.reduce((total, row) => total + row.totalPins, BigInt(0))) },
    { label: "Total earned", value: formatEuro(earned) },
    { label: "Total paid", value: formatEuro(paid) },
    { label: balance.lt(0) ? "Overpaid" : "Balance to pay", value: formatEuro(balance.abs()) },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Admin workspace</p>
        <h1 className="text-2xl font-bold text-slate-900">Cable Making</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Define connectors and cables, assemble harnesses, then record completed work and payments.</p>
        <nav aria-label="Cable making sections" className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
          <Link href="/admin/cable-making/parts#connectors" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">1. Connectors</Link>
          <Link href="/admin/cable-making/parts#cables" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">2. Cables</Link>
          <a href="#cable-types" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">3. Harnesses</a>
          <a href="#work-log" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">Work log</a>
          <a href="#payments" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">Payments</a>
          <Link href="/admin/cable-making/activity" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100">Activity log</Link>
        </nav>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {summary.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium text-slate-600">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <Panel id="completed-by-location" title="Completed cables by location"
        description="All-time quantities from the work log, grouped by the recorded location. This is not a current stock count.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {locationSummary.map((group) => (
            <section key={group.location ?? "not-set"} aria-label={`${group.label} completed cables`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{group.label}</h3>
                <span className="text-sm font-medium text-slate-600">{numbers.format(group.total)} completed</span>
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
        <a href="#work-log" className="inline-block text-sm font-medium text-blue-700 underline">View work log</a>
      </Panel>

      <Panel id="cable-types" title="Harnesses" description="Add a harness, then choose its connectors and cables in Harness Creator. Rate changes apply only to new work.">
          <div className="flex flex-wrap gap-3 text-sm"><Link className="text-blue-700 underline" href="/admin/cable-making/parts#connectors">Manage connectors</Link><Link className="text-blue-700 underline" href="/admin/cable-making/parts#cables">Manage cables</Link></div>
          <AddForm title="Add a harness" open={cables.length === 0}><CableTypeForm /></AddForm>
          {cables.length === 0 ? <p className="text-sm text-slate-600">No harnesses yet. Add one to create a drawing.</p> : (
          <div className="grid gap-3">
          {cables.map((cable) => {
            const drawing = savedHarnessDrawing(cable.name, cable.wiringDesign);
            return (
            <div key={cable.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
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
              {drawing && (drawing.success ? <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900">Saved wiring drawing</h4>
                <div className="max-h-96 overflow-auto rounded-md border border-slate-200" tabIndex={0} aria-label={`${cable.name} saved drawing, scrollable`}>
                  {drawing.design.version === 4
                    ? <FullHarnessDrawing id={cable.id} name={cable.name} design={drawing.design} svg={drawing.svg}
                      hasHarnessImage={cable.attachments.some((attachment) => attachment.kind === "IMAGE")} />
                    : <Image unoptimized src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.svg)}`}
                      alt={`${cable.name} saved wiring drawing`} width={CABLE_WIRING_WIDTH} height={100}
                      className="block h-auto w-full min-w-[700px]" />}
                </div>
              </div> : <p role="alert" className="text-sm text-red-700">This saved drawing could not be loaded. It has not been changed.</p>)}
              {cable.attachments.length > 0 && (
                <CableAttachmentPreviews cableId={cable.id} cableName={cable.name} attachments={cable.attachments} />
              )}
            </div>
          ); })}
          </div>)}
      </Panel>

      <Panel id="work-log" title="Work log" description="Record finished batches. The pin count and rate are saved with each batch.">
        {cables.some((cable) => !cable.requiresDrawing || cable.pinCountFromDrawing)
          ? <AddForm title="Record a completed batch"><CableWorkForm cables={cables.filter((cable) => !cable.requiresDrawing || cable.pinCountFromDrawing).map(({ id, name }) => ({ id, name }))} /></AddForm>
          : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Add a <a href="#cable-types" className="font-medium text-blue-700 underline">harness</a> and save its drawing before recording a batch.</p>}
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
      </Panel>

      <Panel id="payments" title="Payments" description="Keep a record of money already paid. Recording a payment does not send money.">
        <AddForm title="Record a payment"><CablePaymentForm /></AddForm>
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
      </Panel>
    </div>
  );
}
