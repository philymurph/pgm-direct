import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AddressForm } from "@/components/account/AddressForm";
import { DeleteAddressButton } from "@/components/account/DeleteAddressButton";

export default async function AddressesPage() {
  const session = await getSession();
  const addresses = session?.customerId
    ? await prisma.customerAddress.findMany({
        where: { customerId: session.customerId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your addresses</h1>

      {addresses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No saved addresses yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded border border-slate-200 bg-white p-4 text-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {address.label || address.type}
                  </p>
                  <p>{address.contactName}</p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.city}
                    {address.county ? `, ${address.county}` : ""}
                  </p>
                  {address.postcode && <p>{address.postcode}</p>}
                </div>
                <DeleteAddressButton addressId={address.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Add a new address
      </h2>
      <AddressForm />
    </div>
  );
}
