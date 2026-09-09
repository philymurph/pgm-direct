import { BrandForm } from "@/components/admin/BrandForm";

export default function NewBrandPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add brand</h1>
      <div className="mt-6">
        <BrandForm brandId={null} />
      </div>
    </div>
  );
}
