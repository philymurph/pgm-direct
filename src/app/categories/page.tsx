import Link from "next/link";
import type { Metadata } from "next";
import { getAllActiveCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all PGM Direct product categories.",
};

export default async function CategoriesPage() {
  const categories = await getAllActiveCategories();
  const topLevel = categories.filter((c) => !c.parentId);
  const bySlugParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const parent = categories.find((p) => p.id === c.parentId);
    if (!parent) continue;
    const list = bySlugParent.get(parent.slug) ?? [];
    list.push(c);
    bySlugParent.set(parent.slug, list);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">All categories</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {topLevel.map((cat) => {
          const children = bySlugParent.get(cat.slug) ?? [];
          return (
            <div
              key={cat.id}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <Link
                href={`/${cat.slug}`}
                className="text-base font-semibold text-slate-900 hover:text-blue-700"
              >
                {cat.name}
              </Link>
              {children.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/${cat.slug}/${child.slug}`}
                        className="hover:text-blue-700"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
