import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ProductCard } from "@/components/product/ProductCard";

export default async function FavouritesPage() {
  const session = await getSession();
  const favourites = session?.customerId
    ? await prisma.favouriteProduct.findMany({
        where: { customerId: session.customerId },
        include: {
          product: {
            include: {
              images: { take: 1 },
              brand: true,
              vatRate: true,
              inventory: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Favourite products</h1>

      {favourites.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          You haven&apos;t saved any favourites yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {favourites.map((fav) => (
            <ProductCard key={fav.id} product={fav.product} />
          ))}
        </div>
      )}
    </div>
  );
}
