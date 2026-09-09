import { DiscountForm } from "@/components/admin/DiscountForm";

export default function NewDiscountPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add discount code</h1>
      <div className="mt-6">
        <DiscountForm discountId={null} />
      </div>
    </div>
  );
}
