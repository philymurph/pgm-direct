import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DiscountForm } from "@/components/admin/DiscountForm";

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const discount = await prisma.discount.findUnique({ where: { id } });
  if (!discount) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{discount.code}</h1>
      <div className="mt-6">
        <DiscountForm
          discountId={discount.id}
          defaultValues={{
            code: discount.code,
            type: discount.type,
            value: Number(discount.value),
            minOrderValue: discount.minOrderValue
              ? Number(discount.minOrderValue)
              : null,
            maxUses: discount.maxUses,
            startsAt: discount.startsAt
              ? discount.startsAt.toISOString().slice(0, 10)
              : null,
            expiresAt: discount.expiresAt
              ? discount.expiresAt.toISOString().slice(0, 10)
              : null,
            isActive: discount.isActive,
          }}
        />
      </div>
    </div>
  );
}
