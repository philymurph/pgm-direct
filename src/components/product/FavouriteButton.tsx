"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleFavouriteAction } from "@/actions/account";

export function FavouriteButton({
  productId,
  initiallyFavourited,
  isLoggedIn,
}: {
  productId: string;
  initiallyFavourited: boolean;
  isLoggedIn: boolean;
}) {
  const [favourited, setFavourited] = useState(initiallyFavourited);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href="/account/login"
        className="text-xs text-slate-500 underline hover:text-blue-700"
      >
        Sign in to save favourites
      </Link>
    );
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFavouriteAction(productId);
          setFavourited(result.favourited);
        })
      }
      disabled={isPending}
      className="text-xs font-medium text-slate-600 hover:text-blue-700"
    >
      {favourited ? "★ Saved to favourites" : "☆ Save to favourites"}
    </button>
  );
}
