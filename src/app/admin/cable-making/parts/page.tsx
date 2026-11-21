import Link from "next/link";
import { redirect } from "next/navigation";
import { AddCablePartButton, EditCablePartButton } from "@/components/admin/CablePartForm";
import { CableMakingNav } from "@/components/admin/CableMakingNav";
import { DeleteCableRecordButton } from "@/components/admin/CableMakingForms";
import { getSession } from "@/lib/auth";
import { cablePartOption } from "@/lib/cable-parts";
import { prisma } from "@/lib/db";

export default async function CablePartsPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");
  const parts = (await prisma.cablePart.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] })).map(cablePartOption);
  return <div className="space-y-6">
    <header>
      <Link href="/admin/cable-making" className="text-sm text-blue-700 underline">Back to Cable Making</Link>
      <h1 className="mt-4 text-2xl font-bold">Connectors and cables</h1>
      <p className="mt-1 text-sm text-slate-600">Define reusable parts, then choose them when creating a harness. Saved harnesses keep a copy of the details.</p>
    </header>
    <CableMakingNav active="parts" />
    {(["CONNECTOR", "CABLE_STOCK"] as const).map((kind) => {
      const entries = parts.filter((part) => part.kind === kind);
      const title = kind === "CONNECTOR" ? "Connectors" : "Cables";
      return <section key={kind} id={kind === "CONNECTOR" ? "connectors" : "cables"} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <AddCablePartButton kind={kind} />
        {entries.length === 0 ? <p className="text-sm text-slate-600">None added yet.</p> :
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map((part) =>
            <li key={part.id} className="rounded-lg border border-slate-200 p-4">
              <p className="break-words font-semibold">{part.name}</p>
              <p className="text-sm text-slate-600">{part.partNumber && `${part.partNumber} · `}
                {part.kind === "CONNECTOR" ? part.pinCount ? `${part.pinCount} pins` : "Pin count not set" :
                  part.cores ? `${part.cores.length} cores` : "Core details not set"}</p>
              {part.imageId && <a className="text-sm text-blue-700 underline" target="_blank" rel="noreferrer"
                href={`/admin/cable-making/parts/${part.id}/images/${part.imageId}`}>View image</a>}
              <div className="mt-2 flex gap-1">
                <EditCablePartButton part={part} />
                <DeleteCableRecordButton target={{ type: "part", id: part.id }} label={`Delete ${part.name}`}
                  confirmation={`Delete "${part.name}"? Parts used in saved drawings cannot be deleted.`} />
              </div>
            </li>)}</ul>}
      </section>;
    })}
  </div>;
}
