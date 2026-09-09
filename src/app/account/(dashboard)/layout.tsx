import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

const navItems = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/favourites", label: "Favourites" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/account/login");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <aside className="space-y-1 md:col-span-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {item.label}
            </Link>
          ))}
          <form action={logoutAction}>
            <button type="submit" className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              Sign out
            </button>
          </form>
        </aside>
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
