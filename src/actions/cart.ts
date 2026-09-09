"use server";

import { revalidatePath } from "next/cache";
import * as cartLib from "@/lib/cart";

export async function addToCartAction(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  try {
    await cartLib.addToCart(input);
    revalidatePath("/cart");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not add to cart",
    };
  }
}

export async function updateCartItemAction(
  cartItemId: string,
  quantity: number,
) {
  try {
    await cartLib.updateCartItemQuantity(cartItemId, quantity);
    revalidatePath("/cart");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not update cart",
    };
  }
}

export async function removeCartItemAction(cartItemId: string) {
  await cartLib.removeCartItem(cartItemId);
  revalidatePath("/cart");
  return { success: true as const };
}
