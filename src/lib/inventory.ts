import "server-only";
import { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

interface InventoryOrderLine {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  allowBackorder: boolean;
  inventoryAllocationStatus: string;
}

export class InventoryUnavailableError extends Error {}

export async function reserveInventoryForOrderLine(
  tx: TransactionClient,
  input: {
    productId: string;
    variantId: string | null;
    quantity: number;
  },
) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: {
      name: true,
      sku: true,
      isActive: true,
      allowBackorder: true,
      inventory: { select: { id: true } },
    },
  });

  if (!product?.isActive) {
    throw new InventoryUnavailableError("A product is no longer available");
  }

  let sku = product.sku;
  let inventoryId = product.inventory?.id ?? null;

  if (input.variantId) {
    const variant = await tx.productVariant.findFirst({
      where: {
        id: input.variantId,
        productId: input.productId,
        isActive: true,
      },
      select: { sku: true, inventory: { select: { id: true } } },
    });
    if (!variant) {
      throw new InventoryUnavailableError(
        `The selected option for "${product.name}" is no longer available`,
      );
    }
    sku = variant.sku;
    inventoryId = variant.inventory?.id ?? null;
  }

  if (product.allowBackorder) {
    return {
      sku,
      allowBackorder: true,
      inventoryAllocationStatus: "UNRESERVED" as const,
    };
  }

  if (!inventoryId) {
    throw new InventoryUnavailableError(`"${product.name}" is out of stock`);
  }

  const reserved = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "Inventory"
    SET
      "quantityReserved" = "quantityReserved" + ${input.quantity},
      "updatedAt" = NOW()
    WHERE "id" = ${inventoryId}
      AND "quantityOnHand" - "quantityReserved" >= ${input.quantity}
    RETURNING "id"
  `);

  if (reserved.length !== 1) {
    throw new InventoryUnavailableError(
      `There is not enough stock of "${product.name}" to complete checkout`,
    );
  }

  return {
    sku,
    allowBackorder: false,
    inventoryAllocationStatus: "RESERVED" as const,
  };
}

async function findInventoryId(
  tx: TransactionClient,
  item: Pick<InventoryOrderLine, "productId" | "variantId">,
): Promise<string | null> {
  if (item.variantId) {
    const inventory = await tx.inventory.findUnique({
      where: { variantId: item.variantId },
      select: { id: true },
    });
    return inventory?.id ?? null;
  }
  if (!item.productId) return null;
  const inventory = await tx.inventory.findUnique({
    where: { productId: item.productId },
    select: { id: true },
  });
  return inventory?.id ?? null;
}

export async function consumeOrderInventory(
  tx: TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });

  for (const item of items) {
    if (item.inventoryAllocationStatus === "SOLD") continue;
    if (
      item.inventoryAllocationStatus === "RELEASED" ||
      item.inventoryAllocationStatus === "RESTOCKED"
    ) {
      throw new InventoryUnavailableError(
        `Inventory for order item ${item.id} is no longer reserved`,
      );
    }

    const previousStatus = item.inventoryAllocationStatus;
    const claimed = await tx.orderItem.updateMany({
      where: { id: item.id, inventoryAllocationStatus: previousStatus },
      data: { inventoryAllocationStatus: "SOLD" },
    });
    if (claimed.count !== 1) continue;

    const inventoryId = await findInventoryId(tx, item);
    if (!inventoryId) {
      if (item.allowBackorder) continue;
      throw new InventoryUnavailableError(
        `Inventory record missing for order item ${item.id}`,
      );
    }

    if (previousStatus === "RESERVED") {
      const updated = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        UPDATE "Inventory"
        SET
          "quantityOnHand" = "quantityOnHand" - ${item.quantity},
          "quantityReserved" = "quantityReserved" - ${item.quantity},
          "updatedAt" = NOW()
        WHERE "id" = ${inventoryId}
          AND "quantityOnHand" >= ${item.quantity}
          AND "quantityReserved" >= ${item.quantity}
        RETURNING "id"
      `);
      if (updated.length !== 1) {
        throw new InventoryUnavailableError(
          `Reserved inventory is inconsistent for order item ${item.id}`,
        );
      }
      continue;
    }

    const stockGuard = item.allowBackorder
      ? Prisma.empty
      : Prisma.sql`AND "quantityOnHand" >= ${item.quantity}`;
    const updated = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "Inventory"
      SET
        "quantityOnHand" = "quantityOnHand" - ${item.quantity},
        "updatedAt" = NOW()
      WHERE "id" = ${inventoryId}
      ${stockGuard}
      RETURNING "id"
    `);
    if (updated.length !== 1) {
      throw new InventoryUnavailableError(
        `Inventory is unavailable for order item ${item.id}`,
      );
    }
  }
}

export async function releaseOrderInventory(
  tx: TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });

  for (const item of items) {
    if (item.inventoryAllocationStatus === "UNRESERVED") {
      await tx.orderItem.updateMany({
        where: { id: item.id, inventoryAllocationStatus: "UNRESERVED" },
        data: { inventoryAllocationStatus: "RELEASED" },
      });
      continue;
    }
    if (item.inventoryAllocationStatus !== "RESERVED") continue;

    const claimed = await tx.orderItem.updateMany({
      where: { id: item.id, inventoryAllocationStatus: "RESERVED" },
      data: { inventoryAllocationStatus: "RELEASED" },
    });
    if (claimed.count !== 1) continue;

    const inventoryId = await findInventoryId(tx, item);
    if (!inventoryId) {
      throw new InventoryUnavailableError(
        `Inventory record missing for order item ${item.id}`,
      );
    }
    const released = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      UPDATE "Inventory"
      SET
        "quantityReserved" = "quantityReserved" - ${item.quantity},
        "updatedAt" = NOW()
      WHERE "id" = ${inventoryId}
        AND "quantityReserved" >= ${item.quantity}
      RETURNING "id"
    `);
    if (released.length !== 1) {
      throw new InventoryUnavailableError(
        `Reserved inventory is inconsistent for order item ${item.id}`,
      );
    }
  }
}

export async function restockOrderInventory(
  tx: TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId, inventoryAllocationStatus: "SOLD" },
  });

  for (const item of items) {
    const claimed = await tx.orderItem.updateMany({
      where: { id: item.id, inventoryAllocationStatus: "SOLD" },
      data: { inventoryAllocationStatus: "RESTOCKED" },
    });
    if (claimed.count !== 1) continue;

    const inventoryId = await findInventoryId(tx, item);
    if (!inventoryId) {
      if (item.allowBackorder) continue;
      throw new InventoryUnavailableError(
        `Inventory record missing for order item ${item.id}`,
      );
    }
    await tx.inventory.update({
      where: { id: inventoryId },
      data: { quantityOnHand: { increment: item.quantity } },
    });
  }
}
