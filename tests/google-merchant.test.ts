import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleMerchantFeed,
  getMerchantAvailability,
  getSchemaAvailability,
} from "../src/lib/google-merchant";

test("maps sellable, backorder, and unavailable inventory consistently", () => {
  assert.equal(
    getMerchantAvailability({
      allowBackorder: false,
      inventory: {
        status: "LOW_STOCK",
        quantityOnHand: 3,
        quantityReserved: 1,
      },
    }),
    "in_stock",
  );
  assert.equal(
    getMerchantAvailability({
      allowBackorder: true,
      inventory: {
        status: "AVAILABLE_TO_ORDER",
        quantityOnHand: 0,
        quantityReserved: 0,
      },
    }),
    "backorder",
  );
  assert.equal(
    getMerchantAvailability({
      allowBackorder: true,
      inventory: {
        status: "DISCONTINUED",
        quantityOnHand: 4,
        quantityReserved: 0,
      },
    }),
    "out_of_stock",
  );
  assert.equal(
    getSchemaAvailability("backorder"),
    "https://schema.org/BackOrder",
  );
});

test("builds escaped Google Merchant RSS with identifiers and optional fields", () => {
  const xml = buildGoogleMerchantFeed({
    title: "PGM Direct products",
    description: "Technical products & components",
    link: "https://pgmdirect.ie",
    items: [
      {
        id: "PGM-00001",
        title: "Enclosure <large>",
        description: 'Weatherproof & suitable for 12" equipment',
        link: "https://pgmdirect.ie/products/enclosure?a=1&b=2",
        imageLink: "https://cdn.example.com/main.png?a=1&b=2",
        additionalImageLinks: ["https://cdn.example.com/second.png"],
        availability: "in_stock",
        price: "12.30 EUR",
        brand: "Bopla",
        gtin: "4006381333931",
        mpn: "BO-123",
        googleProductCategory: "632",
        productType: "Enclosures > Plastic enclosures",
        shippingWeightKg: "0.25",
      },
    ],
  });

  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:id>PGM-00001<\/g:id>/);
  assert.match(xml, /<title>Enclosure &lt;large&gt;<\/title>/);
  assert.match(xml, /Technical products &amp; components/);
  assert.match(xml, /a=1&amp;b=2/);
  assert.match(xml, /<g:price>12\.30 EUR<\/g:price>/);
  assert.match(xml, /<g:gtin>4006381333931<\/g:gtin>/);
  assert.match(xml, /<g:shipping_weight>0\.25 kg<\/g:shipping_weight>/);
  assert.doesNotMatch(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
});

test("marks products without manufacturer identifiers explicitly", () => {
  const xml = buildGoogleMerchantFeed({
    title: "Products",
    description: "Products",
    link: "https://pgmdirect.ie",
    items: [
      {
        id: "PGM-00002",
        title: "Unbranded item",
        description: "An item without assigned identifiers",
        link: "https://pgmdirect.ie/products/unbranded",
        imageLink: "https://cdn.example.com/item.png",
        availability: "out_of_stock",
        price: "1.00 EUR",
      },
    ],
  });

  assert.match(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
});
