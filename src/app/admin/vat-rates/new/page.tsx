import { VatRateForm } from "@/components/admin/VatRateForm";

export default function NewVatRatePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add VAT rate</h1>
      <div className="mt-6">
        <VatRateForm vatRateId={null} />
      </div>
    </div>
  );
}
