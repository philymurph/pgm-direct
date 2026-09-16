import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/catalog";
import { CategoryPageContent } from "@/components/catalog/CategoryPageContent";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: { slug: true },
    });
    return categories.map((c) => ({ category: c.slug }));
  } catch {
    // No database available at build time (e.g. CI without DB access) — routes
    // are still rendered on-demand since `dynamicParams` defaults to true.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.seoTitle ?? category.name,
    description: category.metaDescription ?? category.description ?? undefined,
    alternates: { canonical: absoluteUrl(`/${category.slug}`) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { category: slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return <CategoryPageContent category={category} searchParams={sp} />;
}
