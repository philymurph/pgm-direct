"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction } from "@/actions/admin/categories";

export function DeleteCategoryButton({ categoryId }: { categoryId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() => {
        if (
          !confirm(
            "Delete this category? Products in it will need to be reassigned first.",
          )
        )
          return;
        startTransition(async () => {
          await deleteCategoryAction(categoryId);
          router.refresh();
        });
      }}
      disabled={isPending}
      className="text-xs text-red-600 hover:underline"
    >
      Delete
    </button>
  );
}
