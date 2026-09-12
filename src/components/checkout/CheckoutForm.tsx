"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckoutAction } from "@/actions/checkout";

interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isQuoteRequired: boolean;
}

export function CheckoutForm({
  shippingMethods,
  guestEmailDefault,
  isLoggedIn,
}: {
  shippingMethods: ShippingMethod[];
  guestEmailDefault?: string;
  isLoggedIn: boolean;
}) {
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [paymentState, setPaymentState] = useState<{
    orderNumber: string;
    token: string;
    publicKey: string;
    environment: string;
    accessToken: string;
  } | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!paymentState || !widgetContainerRef.current) return;

    let destroyFn: (() => void) | undefined;
    let cancelled = false;

    import("@revolut/checkout").then(async (mod) => {
      if (cancelled) return;
      const RevolutCheckout = mod.default;
      const { destroy } = await RevolutCheckout.embeddedCheckout({
        publicToken: paymentState.publicKey,
        mode: paymentState.environment === "production" ? "prod" : "sandbox",
        target: widgetContainerRef.current!,
        createOrder: async () => ({ publicId: paymentState.token }),
        onSuccess: () => {
          const params = new URLSearchParams({
            order: paymentState.orderNumber,
            token: paymentState.accessToken,
          });
          router.push(`/checkout/success?${params}`);
        },
        onError: ({ error: err }) => {
          setError(err.message || "Payment failed. Please try again.");
        },
        onCancel: () => {
          setError("Payment was cancelled.");
        },
      });
      destroyFn = destroy;
    });

    return () => {
      cancelled = true;
      destroyFn?.();
    };
  }, [paymentState, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const billing = {
      contactName: String(formData.get("billing_contactName") ?? ""),
      companyName:
        String(formData.get("billing_companyName") ?? "") || undefined,
      vatNumber: String(formData.get("billing_vatNumber") ?? "") || undefined,
      line1: String(formData.get("billing_line1") ?? ""),
      line2: String(formData.get("billing_line2") ?? "") || undefined,
      city: String(formData.get("billing_city") ?? ""),
      county: String(formData.get("billing_county") ?? "") || undefined,
      postcode: String(formData.get("billing_postcode") ?? "") || undefined,
      country: "IE",
      phone: String(formData.get("billing_phone") ?? "") || undefined,
    };

    const delivery = sameAsBilling
      ? billing
      : {
          contactName: String(formData.get("delivery_contactName") ?? ""),
          companyName:
            String(formData.get("delivery_companyName") ?? "") || undefined,
          line1: String(formData.get("delivery_line1") ?? ""),
          line2: String(formData.get("delivery_line2") ?? "") || undefined,
          city: String(formData.get("delivery_city") ?? ""),
          county: String(formData.get("delivery_county") ?? "") || undefined,
          postcode:
            String(formData.get("delivery_postcode") ?? "") || undefined,
          country: "IE",
          phone: String(formData.get("delivery_phone") ?? "") || undefined,
        };

    const input = {
      guestEmail: isLoggedIn
        ? undefined
        : String(formData.get("guestEmail") ?? ""),
      purchaseReference:
        String(formData.get("purchaseReference") ?? "") || undefined,
      shippingMethodId: String(formData.get("shippingMethodId") ?? ""),
      discountCode: String(formData.get("discountCode") ?? "") || undefined,
      billing,
      delivery,
      sameAsBilling,
    };

    startTransition(async () => {
      const result = await startCheckoutAction(input);
      if (
        !result.success ||
        !result.revolutOrderToken ||
        !result.revolutPublicKey ||
        !result.checkoutAccessToken
      ) {
        setError(result.error ?? "Could not start checkout");
        return;
      }
      setPaymentState({
        orderNumber: result.orderNumber!,
        token: result.revolutOrderToken,
        publicKey: result.revolutPublicKey,
        environment: result.revolutEnvironment ?? "sandbox",
        accessToken: result.checkoutAccessToken,
      });
    });
  }

  if (paymentState) {
    return (
      <div>
        <p className="mb-4 text-sm text-slate-600">
          Order <strong>{paymentState.orderNumber}</strong> created. Complete
          payment below.
        </p>
        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div ref={widgetContainerRef} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoggedIn && (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            name="guestEmail"
            type="email"
            required
            defaultValue={guestEmailDefault}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">
          Billing address
        </legend>
        <AddressFields prefix="billing" />
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          Delivery address is the same as billing
        </label>
      </fieldset>

      {!sameAsBilling && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">
            Delivery address (Republic of Ireland only)
          </legend>
          <AddressFields prefix="delivery" />
        </fieldset>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Purchase reference (optional)
        </label>
        <input
          name="purchaseReference"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Discount code (optional)
        </label>
        <input
          name="discountCode"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          Delivery method
        </legend>
        <div className="space-y-2">
          {shippingMethods.map((method, i) => (
            <label
              key={method.id}
              className="flex items-center gap-3 rounded border border-slate-200 p-3 text-sm"
            >
              <input
                type="radio"
                name="shippingMethodId"
                value={method.id}
                required
                defaultChecked={i === 0}
                disabled={method.isQuoteRequired}
              />
              <span className="flex-1">
                <span className="font-medium text-slate-900">
                  {method.name}
                </span>
                {method.description && (
                  <span className="block text-xs text-slate-500">
                    {method.description}
                  </span>
                )}
              </span>
              <span className="font-medium text-slate-900">
                {method.isQuoteRequired
                  ? "Quote required"
                  : `€${method.price.toFixed(2)}`}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Preparing checkout…" : "Continue to payment"}
      </button>
    </form>
  );
}

function AddressFields({ prefix }: { prefix: string }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        name={`${prefix}_contactName`}
        placeholder="Full name"
        required
        className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name={`${prefix}_companyName`}
        placeholder="Company (optional)"
        className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      {prefix === "billing" && (
        <input
          name="billing_vatNumber"
          placeholder="VAT number (optional)"
          className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
      )}
      <input
        name={`${prefix}_line1`}
        placeholder="Address line 1"
        required
        className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name={`${prefix}_line2`}
        placeholder="Address line 2 (optional)"
        className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name={`${prefix}_city`}
        placeholder="Town / City"
        required
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name={`${prefix}_county`}
        placeholder="County"
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name={`${prefix}_postcode`}
        placeholder="Eircode / Postcode"
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Ireland
      </div>
      <input
        name={`${prefix}_phone`}
        placeholder="Phone"
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
