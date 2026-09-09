import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VatRateForm } from "@/components/admin/VatRateForm";

export default async function EditVatRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vatRate = await prisma.vatRate.findUnique({ where: { id } });
  if (!vatRate) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{vatRate.name}</h1>
      <div className="mt-6">
        <VatRateForm
          vatRateId={vatRate.id}
          defaultValues={{
            name: vatRate.name,
            ratePercent: Number(vatRate.ratePercent),
            isDefault: vatRate.isDefault,
          }}
        />
      </div>
    </div>
  );
}
