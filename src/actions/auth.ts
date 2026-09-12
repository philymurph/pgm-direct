"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { mergeGuestCartIntoCustomer } from "@/lib/cart";
import { loginSchema, registerSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export interface AuthFormState {
  success: boolean;
  error?: string;
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = getClientIp(await headers());
  if (!(await rateLimit(`register:${ip}`, 10, 60_000)).allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again shortly.",
    };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid details",
    };
  }

  const { email, password, firstName, lastName, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists",
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      customer: { create: { firstName, lastName, phone } },
    },
    include: { customer: true },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    customerId: user.customer?.id,
  });
  if (user.customer) await mergeGuestCartIntoCustomer(user.customer.id);

  redirect("/account");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = getClientIp(await headers());
  if (!(await rateLimit(`login:${ip}`, 10, 60_000)).allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again shortly.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: "Enter a valid email and password" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { customer: true },
  });

  // Deliberately generic error to avoid revealing which accounts exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { success: false, error: "Incorrect email or password" };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    customerId: user.customer?.id,
  });
  if (user.customer) await mergeGuestCartIntoCustomer(user.customer.id);

  redirect(user.role === "ADMIN" ? "/admin" : "/account");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
