import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShippingMethodForm } from "@/components/admin/ShippingMethodForm";

export default async function EditShippingMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const method = await prisma.shippingMethod.findUnique({ where: { id } });
  if (!method) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{method.name}</h1>
      <div className="mt-6">
        <ShippingMethodForm
          methodId={method.id}
          defaultValues={{
            name: method.name,
            description: method.description,
            price: Number(method.price),
            freeAboveSubtotal: method.freeAboveSubtotal
              ? Number(method.freeAboveSubtotal)
              : null,
            isQuoteRequired: method.isQuoteRequired,
            isActive: method.isActive,
            sortOrder: method.sortOrder,
          }}
        />
      </div>
    </div>
  );
}
