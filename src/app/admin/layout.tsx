import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/cable-making", label: "Cable Making" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/shipping", label: "Delivery methods" },
  { href: "/admin/vat-rates", label: "VAT rates" },
  { href: "/admin/discounts", label: "Discount codes" },
  { href: "/admin/settings", label: "Settings" },
];

function AdminNavigation() {
  return (
    <>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}
          className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
          {item.label}
        </Link>
      ))}
      <form action={logoutAction}>
        <button type="submit" className="mt-4 block w-full rounded px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">
          Sign out
        </button>
      </form>
    </>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:gap-8 lg:px-8">
      <details className="rounded-lg border border-slate-200 p-3 md:hidden">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Admin navigation</summary>
        <nav aria-label="Admin" className="mt-2"><AdminNavigation /></nav>
      </details>
      <aside className="hidden w-48 shrink-0 space-y-1 md:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Admin
        </h2>
        <nav aria-label="Admin"><AdminNavigation /></nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
