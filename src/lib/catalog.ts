import "server-only";
import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

export async function getHeaderCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getHomepageData() {
  const [
    categories,
    featuredProducts,
    newProducts,
    popularProducts,
    featuredBrands,
  ] = await Promise.all([
    prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        products: { some: { isActive: true } },
      },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        vatRate: true,
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, isNew: true },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        vatRate: true,
      },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        vatRate: true,
      },
      take: 8,
      orderBy: { orderItems: { _count: "desc" } },
    }),
    prisma.brand.findMany({
      where: { isFeatured: true, products: { some: { isActive: true } } },
      take: 12,
    }),
  ]);

  return {
    categories,
    featuredProducts,
    newProducts,
    popularProducts,
    featuredBrands,
  };
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug, isActive: true },
    include: {
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      parent: true,
      filterAttributes: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export interface CategoryProductFilters {
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  specs?: Record<string, string[]>; // key -> selected values
  sort?: "relevance" | "price-asc" | "price-desc" | "newest";
  page?: number;
  pageSize?: number;
}

/** Descendant category ids (a category page shows products from itself + all subcategories). */
async function getCategoryAndDescendantIds(
  categoryId: string,
): Promise<string[]> {
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const idsToInclude = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of all) {
      if (
        c.parentId &&
        idsToInclude.has(c.parentId) &&
        !idsToInclude.has(c.id)
      ) {
        idsToInclude.add(c.id);
        changed = true;
      }
    }
  }
  return [...idsToInclude];
}

export async function getProductsForCategory(
  categoryId: string,
  filters: CategoryProductFilters,
) {
  const categoryIds = await getCategoryAndDescendantIds(categoryId);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;

  const where: Prisma.ProductWhereInput = {
    categoryId: { in: categoryIds },
    isActive: true,
  };

  if (filters.brandIds?.length) where.brandId = { in: filters.brandIds };
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.sellingPriceExVat = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.inStockOnly) {
    where.inventory = {
      status: { in: ["IN_STOCK", "LOW_STOCK", "AVAILABLE_TO_ORDER"] },
    };
  }
  if (filters.specs) {
    for (const [key, values] of Object.entries(filters.specs)) {
      if (!values.length) continue;
      where.specifications = { some: { key, value: { in: values } } };
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { sellingPriceExVat: "asc" }
      : filters.sort === "price-desc"
        ? { sellingPriceExVat: "desc" }
        : filters.sort === "newest"
          ? { createdAt: "desc" }
          : { isFeatured: "desc" };

  const [products, total, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        vatRate: true,
        inventory: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    prisma.brand.findMany({
      where: {
        products: { some: { categoryId: { in: categoryIds }, isActive: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return { products, total, page, pageSize, brands, categoryIds };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      brand: true,
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
      documents: true,
      variants: { where: { isActive: true }, include: { inventory: true } },
      inventory: true,
      vatRate: true,
      relatedTo: {
        where: { kind: "RELATED" },
        include: {
          related: {
            include: { images: { take: 1 }, vatRate: true, brand: true },
          },
        },
      },
      // ACCESSORY relations reuse the same join table with a different `kind`.
    },
  });
}

export async function getAllProducts(filters: CategoryProductFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (filters.brandIds?.length) where.brandId = { in: filters.brandIds };
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.sellingPriceExVat = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.inStockOnly) {
    where.inventory = {
      status: { in: ["IN_STOCK", "LOW_STOCK", "AVAILABLE_TO_ORDER"] },
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { sellingPriceExVat: "asc" }
      : filters.sort === "price-desc"
        ? { sellingPriceExVat: "desc" }
        : filters.sort === "newest"
          ? { createdAt: "desc" }
          : { isFeatured: "desc" };

  const [products, total, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        brand: true,
        vatRate: true,
        inventory: true,
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { products, total, page, pageSize, brands };
}

export async function getAccessoriesForProduct(productId: string) {
  const relations = await prisma.productRelation.findMany({
    where: { productId, kind: "ACCESSORY" },
    include: {
      related: { include: { images: { take: 1 }, vatRate: true, brand: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return relations.map((r) => r.related);
}

export async function searchProducts(query: string, limit = 10) {
  if (!query.trim()) return [];

  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { mpn: { contains: query, mode: "insensitive" } },
        { manufacturer: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { shortDescription: { contains: query, mode: "insensitive" } },
        { brand: { name: { contains: query, mode: "insensitive" } } },
        {
          specifications: {
            some: { value: { contains: query, mode: "insensitive" } },
          },
        },
      ],
    },
    include: { images: { take: 1 }, brand: true, vatRate: true },
    take: limit,
  });
}

export async function getAllActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getAllBrands() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } });
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({ where: { slug } });
}

export async function getActiveShippingMethods() {
  return prisma.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/** Distinct spec values in-scope, used to render "available options" for a category's dynamic filters. */
export async function getDistinctSpecValues(
  categoryIds: string[],
  key: string,
): Promise<string[]> {
  const rows = await prisma.productSpecification.findMany({
    where: {
      key,
      product: { categoryId: { in: categoryIds }, isActive: true },
    },
    select: { value: true },
    distinct: ["value"],
  });
  return rows.map((r) => r.value).sort();
}
