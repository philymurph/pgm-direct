import Link from "next/link";
import { redirect } from "next/navigation";
import { CableMakingNav } from "@/components/admin/CableMakingNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const pageSize = 25;
const dates = new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const actions: Record<string, string> = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };
const entities: Record<string, string> = {
  PART: "part", HARNESS: "harness", DRAWING: "drawing", WORK: "work batch",
  PAYMENT: "payment", ATTACHMENT: "attachment",
};

export default async function CableActivityPage({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== "ADMIN") redirect("/");
  const { page: value } = await searchParams;
  const requested = typeof value === "string" && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : 1;
  const { entries, page, pages } = await prisma.$transaction(async (tx) => {
    const count = await tx.cableAuditEntry.count();
    const pages = Math.max(1, Math.ceil(count / pageSize));
    const page = Math.min(requested, pages);
    const entries = await tx.cableAuditEntry.findMany({
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize,
    });
    return { entries, page, pages };
  }, { isolationLevel: "RepeatableRead" });

  return <div className="space-y-5">
    <header>
      <Link href="/admin/cable-making" className="text-sm text-blue-700 underline">Back to Cable Making</Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Cable Making activity log</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        Successful changes made through Cable Making are recorded from the time this log was enabled. Earlier changes cannot be attributed.
        Attachment entries record file details and a fingerprint, not the file contents.
      </p>
    </header>
    <CableMakingNav active="activity" />
    {entries.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
      No changes recorded yet.
    </p> : <ol className="space-y-3">
      {entries.map((entry) => <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="break-words font-semibold text-slate-900">
            {actions[entry.action] ?? entry.action} {entities[entry.entityType] ?? entry.entityType}: {entry.entityName}
          </h2>
          <time className="text-sm text-slate-600" dateTime={entry.occurredAt.toISOString()}>{dates.format(entry.occurredAt)} UTC</time>
        </div>
        <p className="mt-1 break-all text-sm text-slate-600">By {entry.actorEmail}</p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-blue-700">View previous and new values</summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {([["Previous", entry.before], ["New", entry.after]] as const).map(([label, snapshot]) => <section key={label} className="min-w-0">
              <h3 className="mb-1 font-semibold text-slate-700">{label}</h3>
              <pre className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {snapshot === null ? "None" : JSON.stringify(snapshot, null, 2)}
              </pre>
            </section>)}
          </div>
        </details>
      </li>)}
    </ol>}
    {pages > 1 && <nav aria-label="Activity log pages" className="flex items-center gap-4 text-sm">
      {page > 1 && <Link className="text-blue-700 underline" href={`/admin/cable-making/activity?page=${page - 1}`}>Newer</Link>}
      <span>Page {page} of {pages}</span>
      {page < pages && <Link className="text-blue-700 underline" href={`/admin/cable-making/activity?page=${page + 1}`}>Older</Link>}
    </nav>}
  </div>;
}
