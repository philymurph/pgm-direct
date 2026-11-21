import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CableCreator } from "@/components/admin/CableCreator";
import { CableImageButton } from "@/components/admin/CableImageButton";
import { getSession } from "@/lib/auth";
import { cableWiringSchema } from "@/lib/cable-wiring";
import { cablePartOption } from "@/lib/cable-parts";
import { prisma } from "@/lib/db";

export default async function CableCreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");

  const { id } = await params;
  const [cable, parts] = await Promise.all([
    prisma.cableType.findUnique({ where: { id }, select: {
      name: true, wiringDesign: true, attachments: { where: { kind: "IMAGE" }, select: { kind: true } },
    } }),
    prisma.cablePart.findMany({
      orderBy: [{ name: "asc" }, { partNumber: "asc" }],
    }),
  ]);
  if (!cable) notFound();
  const saved = cable.wiringDesign === null ? null : cableWiringSchema.safeParse(cable.wiringDesign);
  const legacy = cable.wiringDesign !== null && typeof cable.wiringDesign === "object" &&
    !Array.isArray(cable.wiringDesign) && !("version" in cable.wiringDesign);

  return (
    <div className="space-y-5">
      <header className="print:hidden">
        <div className="flex flex-wrap gap-4 text-sm text-blue-700 underline">
          <Link href="/admin/cable-making?section=harnesses">Back to Harnesses</Link>
          <Link href="/admin/cable-making/parts">Parts library</Link>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue-700">Harness Creator</p>
        <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">{cable.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Choose connectors and cables, connect each core, then save the harness build sheet.</p>
        {cable.attachments.length > 0 && <div className="mt-3"><CableImageButton src={`/admin/cable-making/${id}/attachments/IMAGE?preview=1`}
          label={`${cable.name} harness`} /></div>}
      </header>
      {saved && !saved.success ? (
        <p role="alert" className="text-red-700">This saved drawing could not be loaded. It has not been changed.</p>
      ) : (
        <>
          {legacy && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 print:hidden">
            This older cable drawing has been converted into harness segments for editing. Check the endpoints and lengths before saving.
          </p>}
          <CableCreator id={id} name={cable.name} initial={saved?.data} parts={parts.map(cablePartOption)} hasHarnessImage={cable.attachments.length > 0} />
        </>
      )}
    </div>
  );
}
