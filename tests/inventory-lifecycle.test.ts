import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../src/lib/db";
import { reserveInventoryForOrderLine } from "../src/lib/inventory";
import {
  completeOrderPayment,
  deleteDiscardableOrder,
  refundOrderPayment,
} from "../src/lib/order-lifecycle";

after(async () => {
  await prisma.$disconnect();
});

test("only one concurrent checkout can reserve the last unit", async () => {
  const fixture = await createProductFixture(1);

  try {
    const reserve = () =>
      prisma.$transaction((tx) =>
        reserveInventoryForOrderLine(tx, {
          productId: fixture.productId,
          variantId: null,
          quantity: 1,
        }),
      );
    const results = await Promise.allSettled([reserve(), reserve()]);

    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      results.filter((result) => result.status === "rejected").length,
      1,
    );

    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { productId: fixture.productId },
    });
    assert.equal(inventory.quantityOnHand, 1);
    assert.equal(inventory.quantityReserved, 1);
  } finally {
    await deleteProductFixture(fixture);
  }
});

test("completion and refund move stock exactly once and clear purchased cart quantities", async () => {
  const fixture = await createProductFixture(5);
  const suffix = randomUUID();
  const variant = await prisma.productVariant.create({
    data: {
      productId: fixture.productId,
      sku: `TEST-VARIANT-${suffix}`,
      name: "Test option",
      inventory: { create: { quantityOnHand: 5 } },
    },
  });
  const cart = await prisma.cart.create({
    data: {
      sessionToken: `test-cart-${suffix}`,
      items: {
        create: {
          productId: fixture.productId,
          variantId: variant.id,
          quantity: 3,
        },
      },
    },
  });
  const discount = await prisma.discount.create({
    data: {
      code: `TEST-${suffix}`,
      type: "FIXED_AMOUNT",
      value: 1,
    },
  });

  const allocation = await prisma.$transaction((tx) =>
    reserveInventoryForOrderLine(tx, {
      productId: fixture.productId,
      variantId: variant.id,
      quantity: 2,
    }),
  );
  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-${suffix}`,
      guestEmail: "buyer@example.test",
      sourceCartId: cart.id,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      billingContactName: "Test Buyer",
      billingLine1: "1 Test Street",
      billingCity: "Dublin",
      deliveryContactName: "Test Buyer",
      deliveryLine1: "1 Test Street",
      deliveryCity: "Dublin",
      discountId: discount.id,
      subtotalExVat: 20,
      vatTotal: 4.6,
      discountTotal: 1,
      totalIncVat: 23.6,
      items: {
        create: {
          productId: fixture.productId,
          variantId: variant.id,
          sku: fixture.sku,
          name: "Test product",
          quantity: 2,
          allowBackorder: allocation.allowBackorder,
          inventoryAllocationStatus: allocation.inventoryAllocationStatus,
          unitPriceExVat: 10,
          vatRatePercent: 23,
          lineTotalExVat: 20,
          lineVatTotal: 4.6,
          lineTotalIncVat: 24.6,
        },
      },
      payments: {
        create: {
          providerOrderId: `provider-${suffix}`,
          amount: 23.6,
          currency: "EUR",
        },
      },
    },
    include: { payments: true },
  });
  const payment = order.payments[0];

  try {
    assert.ok(payment);
    const completed = await completeOrderPayment(payment.id, order.id);
    assert.equal(completed?.status, "PAID");

    let inventory = await prisma.inventory.findUniqueOrThrow({
      where: { variantId: variant.id },
    });
    assert.equal(inventory.quantityOnHand, 3);
    assert.equal(inventory.quantityReserved, 0);

    const remainingCartItem = await prisma.cartItem.findFirstOrThrow({
      where: {
        cartId: cart.id,
        productId: fixture.productId,
        variantId: variant.id,
      },
    });
    assert.equal(remainingCartItem.quantity, 1);
    assert.equal(
      (await prisma.discount.findUniqueOrThrow({ where: { id: discount.id } }))
        .usedCount,
      1,
    );

    assert.equal(await completeOrderPayment(payment.id, order.id), null);
    inventory = await prisma.inventory.findUniqueOrThrow({
      where: { variantId: variant.id },
    });
    assert.equal(inventory.quantityOnHand, 3);

    assert.equal(await refundOrderPayment(payment.id, order.id), true);
    inventory = await prisma.inventory.findUniqueOrThrow({
      where: { variantId: variant.id },
    });
    assert.equal(inventory.quantityOnHand, 5);

    assert.equal(await refundOrderPayment(payment.id, order.id), false);
    inventory = await prisma.inventory.findUniqueOrThrow({
      where: { variantId: variant.id },
    });
    assert.equal(inventory.quantityOnHand, 5);
  } finally {
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.discount.delete({ where: { id: discount.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
    await prisma.productVariant.delete({ where: { id: variant.id } });
    await deleteProductFixture(fixture);
  }
});

test("deleting an abandoned order releases its stock reservation", async () => {
  const fixture = await createProductFixture(2);
  const suffix = randomUUID();
  const allocation = await prisma.$transaction((tx) =>
    reserveInventoryForOrderLine(tx, {
      productId: fixture.productId,
      variantId: null,
      quantity: 1,
    }),
  );
  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-DELETE-${suffix}`,
      guestEmail: "buyer@example.test",
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      billingContactName: "Test Buyer",
      billingLine1: "1 Test Street",
      billingCity: "Dublin",
      deliveryContactName: "Test Buyer",
      deliveryLine1: "1 Test Street",
      deliveryCity: "Dublin",
      subtotalExVat: 10,
      vatTotal: 2.3,
      totalIncVat: 12.3,
      items: {
        create: {
          productId: fixture.productId,
          sku: fixture.sku,
          name: "Test product",
          quantity: 1,
          inventoryAllocationStatus: allocation.inventoryAllocationStatus,
          unitPriceExVat: 10,
          vatRatePercent: 23,
          lineTotalExVat: 10,
          lineVatTotal: 2.3,
          lineTotalIncVat: 12.3,
        },
      },
    },
  });

  try {
    await deleteDiscardableOrder(order.id);

    assert.equal(
      await prisma.order.findUnique({ where: { id: order.id } }),
      null,
    );
    const inventory = await prisma.inventory.findUniqueOrThrow({
      where: { productId: fixture.productId },
    });
    assert.equal(inventory.quantityOnHand, 2);
    assert.equal(inventory.quantityReserved, 0);
  } finally {
    await prisma.order.deleteMany({ where: { id: order.id } });
    await deleteProductFixture(fixture);
  }
});

async function createProductFixture(quantityOnHand: number) {
  const suffix = randomUUID();
  const category = await prisma.category.create({
    data: { name: `Test category ${suffix}`, slug: `test-category-${suffix}` },
  });
  const vatRate = await prisma.vatRate.create({
    data: { name: `Test VAT ${suffix}`, ratePercent: 23 },
  });
  const sku = `TEST-SKU-${suffix}`;
  const product = await prisma.product.create({
    data: {
      sku,
      name: `Test product ${suffix}`,
      slug: `test-product-${suffix}`,
      categoryId: category.id,
      vatRateId: vatRate.id,
      costPrice: 5,
      sellingPriceExVat: 10,
      inventory: { create: { quantityOnHand } },
    },
  });
  return {
    productId: product.id,
    categoryId: category.id,
    vatRateId: vatRate.id,
    sku,
  };
}

async function deleteProductFixture(fixture: {
  productId: string;
  categoryId: string;
  vatRateId: string;
}) {
  await prisma.product.delete({ where: { id: fixture.productId } });
  await prisma.category.delete({ where: { id: fixture.categoryId } });
  await prisma.vatRate.delete({ where: { id: fixture.vatRateId } });
}
