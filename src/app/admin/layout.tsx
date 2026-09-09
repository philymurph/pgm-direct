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
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/shipping", label: "Delivery methods" },
  { href: "/admin/vat-rates", label: "VAT rates" },
  { href: "/admin/discounts", label: "Discount codes" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <aside className="w-48 shrink-0 space-y-1">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Admin
        </h2>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-4 block w-full rounded px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
