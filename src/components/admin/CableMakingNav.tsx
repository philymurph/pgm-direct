import Link from "next/link";

const sections = [
  { id: "overview", label: "Overview", href: "/admin/cable-making" },
  { id: "harnesses", label: "Harnesses", href: "/admin/cable-making?section=harnesses" },
  { id: "parts", label: "Parts", href: "/admin/cable-making/parts" },
  { id: "work", label: "Work log", href: "/admin/cable-making?section=work" },
  { id: "payments", label: "Payments", href: "/admin/cable-making?section=payments" },
  { id: "activity", label: "Activity", href: "/admin/cable-making/activity" },
] as const;

export function CableMakingNav({ active }: { active: (typeof sections)[number]["id"] }) {
  return <nav aria-label="Cable making sections" className="flex flex-wrap gap-2 text-sm font-medium">
    {sections.map((section) => <Link key={section.id} href={section.href}
      aria-current={section.id === active ? "page" : undefined}
      className={section.id === active
        ? "rounded-md border border-blue-700 bg-blue-700 px-3 py-2 text-white"
        : "rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100"}>
      {section.label}
    </Link>)}
  </nav>;
}
