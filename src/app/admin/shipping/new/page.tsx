import { ShippingMethodForm } from "@/components/admin/ShippingMethodForm";

export default function NewShippingMethodPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add delivery method</h1>
      <div className="mt-6">
        <ShippingMethodForm methodId={null} />
      </div>
    </div>
  );
}
