"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { contactSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendContactEnquiryEmail } from "@/lib/email-templates";

export interface ContactFormState {
  success: boolean;
  error?: string;
}

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const ip = getClientIp(await headers());
  if (!rateLimit(`contact:${ip}`, 5, 60_000).allowed) {
    return {
      success: false,
      error: "Too many submissions. Please try again shortly.",
    };
  }

  const parsed = contactSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
    message: formData.get("message"),
    orderNumber: formData.get("orderNumber") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details",
    };
  }

  const session = await getSession();

  await prisma.contactEnquiry.create({
    data: { ...parsed.data, customerId: session?.customerId },
  });

  await sendContactEnquiryEmail(parsed.data);
  return { success: true };
}
