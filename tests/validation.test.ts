import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutSchema,
  customerEmailSchema,
  gtinSchema,
} from "../src/lib/validation";

test("normalizes valid customer email addresses", () => {
  assert.equal(
    customerEmailSchema.parse("  Customer@Gmail.com "),
    "customer@gmail.com",
  );
});

test("rejects common email-domain typos with a correction", () => {
  const result = customerEmailSchema.safeParse("sineadkenrick@gmail.con");

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues[0]?.message,
      "Check your email address. Did you mean sineadkenrick@gmail.com?",
    );
  }
});

test("rejects delivery addresses outside the Republic of Ireland", () => {
  const address = {
    contactName: "Test Customer",
    line1: "1 Test Street",
    city: "Belfast",
    country: "GB",
  };
  const result = checkoutSchema.safeParse({
    guestEmail: "customer@example.com",
    shippingMethodId: "shipping-method",
    billing: { ...address, country: "IE" },
    delivery: address,
    sameAsBilling: false,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues[0]?.message,
      "Delivery is currently available only within the Republic of Ireland",
    );
  }
});

test("checks the billing country when it is also the delivery address", () => {
  const address = {
    contactName: "Test Customer",
    line1: "1 Test Street",
    city: "London",
    country: "GB",
  };
  const result = checkoutSchema.safeParse({
    guestEmail: "customer@example.com",
    shippingMethodId: "shipping-method",
    billing: address,
    delivery: { ...address, country: "IE" },
    sameAsBilling: true,
  });

  assert.equal(result.success, false);
});

test("normalizes and validates GTINs", () => {
  assert.equal(gtinSchema.parse("4006 3813-33931"), "4006381333931");
  assert.equal(gtinSchema.safeParse("4006381333932").success, false);
  assert.equal(gtinSchema.safeParse("12345").success, false);
});
