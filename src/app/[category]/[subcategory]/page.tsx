import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/catalog";
import { CategoryPageContent } from "@/components/catalog/CategoryPageContent";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { subcategory } = await params;
  const category = await getCategoryBySlug(subcategory);
  if (!category) return {};

  return {
    title: category.seoTitle ?? category.name,
    description: category.metaDescription ?? category.description ?? undefined,
    alternates: {
      canonical: absoluteUrl(`/${category.parent?.slug}/${category.slug}`),
    },
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { category: parentSlug, subcategory } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(subcategory);
  if (!category || category.parent?.slug !== parentSlug) notFound();

  return <CategoryPageContent category={category} searchParams={sp} />;
}
