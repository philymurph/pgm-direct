import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getCartItemCount } from "@/lib/cart";
import { SearchBar } from "@/components/search/SearchBar";
import { VatToggle } from "./VatToggle";
import { PgmMark } from "./PgmMark";
import { MobileNav } from "./MobileNav";

const primaryNav = [
  { label: "Products", href: "/products" },
  { label: "Enclosures", href: "/enclosures" },
  { label: "Brands", href: "/brands" },
  { label: "Contact", href: "/contact" },
];

export async function Header() {
  const [session, cartCount] = await Promise.all([
    getSession(),
    getCartItemCount(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <MobileNav navItems={primaryNav} isLoggedIn={!!session} />

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-slate-900"
        >
          <PgmMark className="h-7 w-7" />
          PGM<span className="text-blue-700">Direct</span>
        </Link>

        <div className="order-3 w-full lg:order-2 lg:max-w-2xl lg:flex-1">
          <SearchBar />
        </div>

        <div className="order-2 ml-auto flex items-center gap-4 lg:order-3">
          <div className="hidden lg:block">
            <VatToggle />
          </div>
          <Link
            href={session ? "/account" : "/account/login"}
            className="hidden text-sm font-medium text-slate-700 hover:text-blue-700 lg:inline"
          >
            {session ? "My account" : "Sign in"}
          </Link>
          <Link
            href="/cart"
            className="relative text-sm font-medium text-slate-700 hover:text-blue-700"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-700 text-[10px] text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav className="hidden border-t border-slate-100 lg:block">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 py-2 text-sm sm:px-6 lg:px-8">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-slate-600 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
