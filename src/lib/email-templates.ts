import type { Order, OrderItem, User } from "@prisma/client";
import { siteConfig } from "@/lib/site";
import { sendEmail } from "@/lib/email";

function formatEuro(value: number): string {
  return `€${value.toFixed(2)}`;
}

export async function sendOrderConfirmationEmail(
  order: Order & {
    items: OrderItem[];
    customer?: { user: Pick<User, "email"> } | null;
  },
): Promise<void> {
  const to = order.guestEmail ?? order.customer?.user.email;
  if (!to) return;

  const itemRows = order.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 8px">${item.name} × ${item.quantity}</td><td style="padding:4px 8px;text-align:right">${formatEuro(
          Number(item.lineTotalIncVat),
        )}</td></tr>`,
    )
    .join("");

  const itemLines = order.items
    .map(
      (item) =>
        `${item.name} x${item.quantity} — ${formatEuro(Number(item.lineTotalIncVat))}`,
    )
    .join("\n");

  const html = `
    <p>Thanks for your order from ${siteConfig.name}!</p>
    <p><strong>Order ${order.orderNumber}</strong></p>
    <table style="border-collapse:collapse;width:100%">${itemRows}</table>
    <p style="margin-top:12px"><strong>Total: ${formatEuro(Number(order.totalIncVat))}</strong></p>
    <p>Delivering to: ${order.deliveryLine1}, ${order.deliveryCity}, ${order.deliveryCountry}</p>
  `;

  const text = `Thanks for your order from ${siteConfig.name}!\n\nOrder ${order.orderNumber}\n${itemLines}\n\nTotal: ${formatEuro(
    Number(order.totalIncVat),
  )}\n\nDelivering to: ${order.deliveryLine1}, ${order.deliveryCity}, ${order.deliveryCountry}`;

  await sendEmail({
    to,
    subject: `Order confirmation — ${order.orderNumber}`,
    html,
    text,
  });
}

interface ContactEnquiryInput {
  type: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message: string;
  orderNumber?: string | null;
}

/** Notifies the shop's contact inbox of a new contact form submission. */
export async function sendContactEnquiryEmail(
  enquiry: ContactEnquiryInput,
): Promise<void> {
  const to = process.env.EMAIL_CONTACT_TO ?? process.env.EMAIL_FROM;
  if (!to) return;

  const details = [
    `Type: ${enquiry.type}`,
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null,
    enquiry.company ? `Company: ${enquiry.company}` : null,
    enquiry.orderNumber ? `Order number: ${enquiry.orderNumber}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to,
    subject: `New contact enquiry from ${enquiry.name}`,
    text: `${details}\n\nMessage:\n${enquiry.message}`,
    html: `<pre>${details}</pre><p>${enquiry.message}</p>`,
    replyTo: enquiry.email,
  });
}
