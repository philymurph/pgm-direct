import type { Metadata } from "next";
import Link from "next/link";
import { getSiteSettings } from "@/lib/catalog";
import { returnPolicyConfig, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Returns Policy",
  description:
    "How to cancel an order, return a product, or report faulty or damaged goods purchased from PGM Direct.",
  alternates: { canonical: `${siteConfig.url}/legal/returns` },
};

export default async function ReturnsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Returns Policy</h1>
      <p className="mt-2 text-sm text-slate-500">
        Last updated 12 September 2026.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-slate-700">
        <p>
          This policy applies to products bought online from {siteConfig.name},
          operated by {settings.companyLegalName}. It does not affect your
          statutory rights.
        </p>

        <div className="not-prose my-6 border-l-4 border-blue-700 bg-blue-50 px-4 py-3 text-sm text-slate-700">
          <p>
            <strong>Return window:</strong> notify us within{" "}
            {returnPolicyConfig.consumerReturnDays} days of delivery.
          </p>
          <p className="mt-1">
            <strong>Return method:</strong> by post or courier after contacting
            us for instructions.
          </p>
          <p className="mt-1">
            <strong>Return cost:</strong> paid by you for a change of mind; paid
            by us for faulty, damaged, or incorrect goods.
          </p>
        </div>

        <h2>1. Consumer right to cancel</h2>
        <p>
          If you are purchasing as a consumer, you may cancel an online order
          without giving a reason within {returnPolicyConfig.consumerReturnDays}{" "}
          days of the day you, or a person nominated by you other than the
          carrier, receives the goods. If one order is delivered in separate
          shipments, the period starts when the last item is received.
        </p>

        <h2>2. How to cancel and return an item</h2>
        <ol>
          <li>
            Before the cancellation period expires, send us a clear statement
            that you wish to cancel. Use our{" "}
            <Link href="/contact">contact page</Link> and include your order
            number.
          </li>
          <li>
            We will confirm the return address and instructions. Please do not
            send goods to our registered office unless we tell you to do so.
          </li>
          <li>
            Send the goods no later than {returnPolicyConfig.consumerReturnDays}{" "}
            days after telling us that you are cancelling. Use suitable
            protective packaging and retain proof of postage or tracking.
          </li>
        </ol>
        <p>
          You may inspect goods as you would in a shop. You are responsible only
          for any reduction in value caused by handling beyond what is necessary
          to establish the goods&apos; nature, characteristics, and operation.
          Original packaging is helpful but is not, by itself, a condition of
          your statutory cancellation right.
        </p>

        <h2>3. Change-of-mind return costs</h2>
        <p>
          You are responsible for the direct cost of returning goods when you
          cancel because you changed your mind. We do not charge a restocking
          fee.
        </p>

        <h2>4. Refunds after cancellation</h2>
        <p>
          We will refund the product price and the cost of our least expensive
          standard delivery option. If you selected a more expensive delivery
          service, the additional delivery charge is not refundable. We may
          reduce the refund to reflect diminished value caused by excessive
          handling.
        </p>
        <p>
          The refund will be made to the original payment method, without a fee,
          no later than {returnPolicyConfig.consumerReturnDays} days after you
          tell us that you are cancelling. We may withhold it until we receive
          the goods or you provide evidence that they have been sent back,
          whichever happens first.
        </p>

        <h2>5. Faulty, damaged, or incorrect goods</h2>
        <p>
          If goods arrive faulty, damaged, or different from what you ordered,
          contact us promptly with your order number and, where useful, photos
          of the problem. We will provide return instructions and cover the
          reasonable return cost. Depending on your statutory rights and the
          circumstances, the available remedy may be a repair, replacement,
          price reduction, or refund.
        </p>
        <p>
          The change-of-mind conditions and costs above do not restrict your
          rights where goods do not conform to the contract, including your
          rights under the Consumer Rights Act 2022.
        </p>

        <h2>6. Exceptions to the cancellation right</h2>
        <p>
          The statutory cancellation right does not apply in certain cases,
          including goods made to your specifications or clearly personalised,
          sealed goods that are unsuitable for return for health protection or
          hygiene reasons once unsealed, and sealed software once unsealed. We
          will identify an applicable exception before you buy. This does not
          remove your rights if an excepted item is faulty or not as described.
        </p>

        <h2>7. Trade and business orders</h2>
        <p>
          The consumer cancellation right does not apply when you buy wholly or
          mainly for business purposes. Returns for trade, custom, or bulk
          orders are governed by the terms agreed for that order. Nothing in
          this section changes any mandatory rights that apply to the buyer.
        </p>

        <h2>8. Contact and cancellation wording</h2>
        <p>
          Submit return requests through our{" "}
          <Link href="/contact">contact page</Link>
          {settings.email ? (
            <>
              {" "}
              or email <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </>
          ) : null}
          . You may use the following wording, but you do not have to:
        </p>
        <blockquote>
          I give notice that I cancel my contract for the sale of [product],
          ordered on [date] and received on [date]. My order number is [order
          number]. Name: [name]. Address: [address]. Date: [date].
        </blockquote>
        <p>
          We will use your information only to handle the return in accordance
          with our <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
