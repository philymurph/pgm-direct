import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

async function main() {
  // --- VAT rates -----------------------------------------------------------
  const [standardVat, reducedVat, zeroVat] = await Promise.all([
    prisma.vatRate.upsert({
      where: { name: "Standard 23%" },
      create: { name: "Standard 23%", ratePercent: 23, isDefault: true },
      update: { isDefault: true },
    }),
    prisma.vatRate.upsert({
      where: { name: "Reduced 13.5%" },
      create: { name: "Reduced 13.5%", ratePercent: 13.5 },
      update: {},
    }),
    prisma.vatRate.upsert({
      where: { name: "Zero Rated 0%" },
      create: { name: "Zero Rated 0%", ratePercent: 0 },
      update: {},
    }),
  ]);
  void reducedVat;
  void zeroVat;

  // --- Site settings ---------------------------------------------------------
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  // --- Shipping methods ------------------------------------------------------
  await prisma.shippingMethod.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Standard Ireland Delivery",
        description: "2-4 working days",
        price: 4.99,
        freeAboveSubtotal: 75,
        sortOrder: 1,
      },
      {
        name: "Collection",
        description: "Collect from our depot",
        price: 0,
        sortOrder: 2,
      },
      {
        name: "Large / Heavy Item Delivery",
        description: "For bulky or heavy items",
        price: 24.99,
        sortOrder: 3,
      },
      {
        name: "Quote Required",
        description: "For oversized or specialist deliveries",
        price: 0,
        isQuoteRequired: true,
        sortOrder: 4,
      },
    ],
  });

  // --- Discount ---------------------------------------------------------------
  await prisma.discount.upsert({
    where: { code: "WELCOME10" },
    create: { code: "WELCOME10", type: "PERCENTAGE", value: 10 },
    update: {},
  });

  // --- Categories --------------------------------------------------------------
  const topLevel = [
    "Electronic Components",
    "Automation & Control",
    "Sensors",
    "IoT & Wireless",
    "Power & Electrical",
    "Relays & Switching",
    "Cables & Connectors",
    "Enclosures",
    "Cameras & Networking",
    "Displays & Control Panels",
    "Development Boards",
    "Microcontrollers",
    "LoRa",
    "Bluetooth",
    "Wireless Equipment",
    "Tools & Accessories",
  ];

  const categoryBySlug = new Map<string, { id: string; slug: string }>();
  for (const [i, name] of topLevel.entries()) {
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      create: { name, slug, sortOrder: i },
      update: { sortOrder: i },
    });
    categoryBySlug.set(slug, cat);
  }

  // Dynamic per-category filters.
  const loraCat = categoryBySlug.get("lora")!;
  await prisma.categoryFilterAttribute.createMany({
    skipDuplicates: true,
    data: [
      {
        categoryId: loraCat.id,
        key: "frequency",
        label: "Frequency",
        unit: "MHz",
        type: "ENUM",
        sortOrder: 1,
      },
      {
        categoryId: loraCat.id,
        key: "lora_chipset",
        label: "LoRa chipset",
        type: "ENUM",
        sortOrder: 2,
      },
      {
        categoryId: loraCat.id,
        key: "interface",
        label: "Interface",
        type: "ENUM",
        sortOrder: 3,
      },
      {
        categoryId: loraCat.id,
        key: "supply_voltage",
        label: "Supply voltage",
        unit: "V",
        type: "ENUM",
        sortOrder: 4,
      },
    ],
  });

  const enclosuresCat = categoryBySlug.get("enclosures")!;
  await prisma.categoryFilterAttribute.createMany({
    skipDuplicates: true,
    data: [
      {
        categoryId: enclosuresCat.id,
        key: "dimensions",
        label: "Dimensions",
        unit: "mm",
        type: "TEXT",
        sortOrder: 1,
      },
      {
        categoryId: enclosuresCat.id,
        key: "material",
        label: "Material",
        type: "ENUM",
        sortOrder: 2,
      },
      {
        categoryId: enclosuresCat.id,
        key: "ip_rating",
        label: "IP rating",
        type: "ENUM",
        sortOrder: 3,
      },
      {
        categoryId: enclosuresCat.id,
        key: "manufacturer",
        label: "Manufacturer",
        type: "ENUM",
        sortOrder: 4,
      },
    ],
  });

  const electronicsCat = categoryBySlug.get("electronic-components")!;
  await prisma.categoryFilterAttribute.createMany({
    skipDuplicates: true,
    data: [
      {
        categoryId: electronicsCat.id,
        key: "voltage",
        label: "Voltage",
        unit: "V",
        type: "ENUM",
        sortOrder: 1,
      },
      {
        categoryId: electronicsCat.id,
        key: "current",
        label: "Current",
        unit: "A",
        type: "ENUM",
        sortOrder: 2,
      },
      {
        categoryId: electronicsCat.id,
        key: "connector_type",
        label: "Connector type",
        type: "ENUM",
        sortOrder: 3,
      },
    ],
  });

  // --- Brands ------------------------------------------------------------------
  const brandNames = [
    "Heltec",
    "Espressif",
    "u-blox",
    "Bopla",
    "Finder",
    "Omron",
    "Reyax",
    "Phoenix Contact",
  ];
  const brandBySlug = new Map<string, { id: string; slug: string }>();
  for (const name of brandNames) {
    const slug = slugify(name);
    const brand = await prisma.brand.upsert({
      where: { slug },
      create: { name, slug, isFeatured: true },
      update: {},
    });
    brandBySlug.set(slug, brand);
  }

  // --- Products ------------------------------------------------------------------
  const products = [
    {
      sku: "PGM-00001",
      mpn: "WIFI-LORA-32-V4",
      name: "Heltec WiFi LoRa 32 V4",
      category: loraCat,
      brand: brandBySlug.get("heltec")!,
      cost: 12.5,
      price: 24.99,
      manufacturer: "Heltec Automation",
      isFeatured: true,
      isNew: true,
      specs: [
        ["frequency", "Frequency", "868", "MHz"],
        ["lora_chipset", "LoRa chipset", "SX1262", ""],
        ["interface", "Interface", "USB-C", ""],
        ["supply_voltage", "Supply voltage", "3.3", "V"],
      ],
    },
    {
      sku: "PGM-00002",
      mpn: "ESP32-WROOM-32E",
      name: "Espressif ESP32-WROOM-32E Module",
      category: categoryBySlug.get("development-boards")!,
      brand: brandBySlug.get("espressif")!,
      cost: 3.2,
      price: 6.5,
      manufacturer: "Espressif Systems",
      isFeatured: true,
      specs: [
        ["voltage", "Voltage", "3.3", "V"],
        ["interface", "Interface", "WiFi/BLE", ""],
      ],
    },
    {
      sku: "PGM-00003",
      mpn: "NEO-M9N",
      name: "u-blox NEO-M9N GNSS Module",
      category: categoryBySlug.get("electronic-components")!,
      brand: brandBySlug.get("u-blox")!,
      cost: 18,
      price: 34.99,
      manufacturer: "u-blox",
      isFeatured: true,
      specs: [
        ["interface", "Interface", "UART/I2C/SPI", ""],
        ["voltage", "Voltage", "3.3", "V"],
      ],
    },
    {
      sku: "PGM-00004",
      mpn: "ZED-F9P",
      name: "u-blox ZED-F9P RTK GNSS Receiver",
      category: categoryBySlug.get("electronic-components")!,
      brand: brandBySlug.get("u-blox")!,
      cost: 145,
      price: 249.99,
      manufacturer: "u-blox",
      specs: [
        ["interface", "Interface", "USB/UART", ""],
        ["voltage", "Voltage", "3.3", "V"],
      ],
    },
    {
      sku: "PGM-00005",
      mpn: "BOPLA-EG-1522",
      name: "Bopla Euromas Enclosure 150x220x75mm",
      category: enclosuresCat,
      brand: brandBySlug.get("bopla")!,
      cost: 14,
      price: 26.5,
      manufacturer: "Bopla",
      specs: [
        ["dimensions", "Dimensions", "150 x 220 x 75", "mm"],
        ["material", "Material", "ABS", ""],
        ["ip_rating", "IP rating", "IP66", ""],
        ["manufacturer", "Manufacturer", "Bopla", ""],
      ],
    },
    {
      sku: "PGM-00006",
      mpn: "40.52.9.024.0000",
      name: "Finder 40.52 Relay 24VDC 2CO 8A",
      category: categoryBySlug.get("relays-switching")!,
      brand: brandBySlug.get("finder")!,
      cost: 4.2,
      price: 8.75,
      manufacturer: "Finder",
      specs: [
        ["voltage", "Voltage", "24", "V"],
        ["current", "Current", "8", "A"],
      ],
    },
    {
      sku: "PGM-00007",
      mpn: "E3F-DS30C4",
      name: "Omron E3F-DS30C4 Photoelectric Sensor",
      category: categoryBySlug.get("sensors")!,
      brand: brandBySlug.get("omron")!,
      cost: 15,
      price: 28.99,
      manufacturer: "Omron",
      specs: [
        ["voltage", "Voltage", "12-24", "V"],
        ["interface", "Interface", "NPN", ""],
      ],
    },
    {
      sku: "PGM-00008",
      mpn: "RYLR993",
      name: "Reyax RYLR993 LoRa RF Module",
      category: loraCat,
      brand: brandBySlug.get("reyax")!,
      cost: 6.5,
      price: 12.99,
      manufacturer: "Reyax Technology",
      isNew: true,
      specs: [
        ["frequency", "Frequency", "868/915", "MHz"],
        ["lora_chipset", "LoRa chipset", "SX1262", ""],
        ["interface", "Interface", "UART", ""],
        ["supply_voltage", "Supply voltage", "3.3", "V"],
      ],
    },
    {
      sku: "PGM-00009",
      mpn: "PC-QUINT-24DC",
      name: "Phoenix Contact QUINT Power Supply 24VDC 10A",
      category: categoryBySlug.get("power-electrical")!,
      brand: brandBySlug.get("phoenix-contact")!,
      cost: 68,
      price: 129,
      manufacturer: "Phoenix Contact",
      isFeatured: true,
      specs: [
        ["voltage", "Voltage", "24", "V"],
        ["current", "Current", "10", "A"],
      ],
    },
    {
      sku: "PGM-00010",
      mpn: "BTS7960",
      name: "BTS7960 43A High Current Motor Driver Module",
      category: categoryBySlug.get("automation-control")!,
      brand: null,
      cost: 4.5,
      price: 9.99,
      manufacturer: "Generic",
      isNew: true,
      specs: [
        ["voltage", "Voltage", "6-27", "V"],
        ["current", "Current", "43", "A"],
      ],
    },
    {
      sku: "PGM-00011",
      mpn: "IP67-M12-5P",
      name: "M12 5-Pin Circular Connector IP67",
      category: categoryBySlug.get("cables-connectors")!,
      brand: null,
      cost: 2.1,
      price: 4.5,
      manufacturer: "Generic",
      specs: [
        ["connector_type", "Connector type", "M12", ""],
        ["ip_rating", "IP rating", "IP67", ""],
      ],
    },
    {
      sku: "PGM-00012",
      mpn: "HC-05",
      name: "HC-05 Bluetooth Serial Module",
      category: categoryBySlug.get("bluetooth")!,
      brand: null,
      cost: 2.8,
      price: 5.99,
      manufacturer: "Generic",
      specs: [
        ["voltage", "Voltage", "3.3-5", "V"],
        ["interface", "Interface", "UART", ""],
      ],
    },
    {
      sku: "PGM-00013",
      mpn: "TP-LINK-CPE210",
      name: "Outdoor Wireless CPE 2.4GHz 300Mbps",
      category: categoryBySlug.get("wireless-equipment")!,
      brand: null,
      cost: 32,
      price: 54.99,
      manufacturer: "Generic",
      specs: [
        ["frequency", "Frequency", "2400", "MHz"],
        ["interface", "Interface", "Ethernet", ""],
      ],
    },
    {
      sku: "PGM-00014",
      mpn: "IP66-DOME-CAM",
      name: "IP66 PoE Dome Network Camera 4MP",
      category: categoryBySlug.get("cameras-networking")!,
      brand: null,
      cost: 45,
      price: 89.99,
      manufacturer: "Generic",
      specs: [
        ["ip_rating", "IP rating", "IP66", ""],
        ["interface", "Interface", "PoE/Ethernet", ""],
      ],
    },
  ];

  const createdProducts: { id: string; slug: string }[] = [];

  for (const p of products) {
    const slug = slugify(p.name);
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        mpn: p.mpn,
        name: p.name,
        slug,
        description: `${p.name} from ${p.manufacturer}. Technical specifications are listed below — see the datasheet for full electrical characteristics.`,
        shortDescription: `${p.manufacturer} ${p.mpn}`,
        brandId: p.brand?.id,
        categoryId: p.category.id,
        costPrice: p.cost,
        sellingPriceExVat: p.price,
        vatRateId: standardVat.id,
        manufacturer: p.manufacturer,
        isFeatured: p.isFeatured ?? false,
        isNew: p.isNew ?? false,
        seoTitle: `${p.name} | PGM Direct`,
        metaDescription: `Buy ${p.name} (${p.mpn}) from PGM Direct — Irish supplier of technical components.`,
        images: {
          create: [{ url: PLACEHOLDER_IMAGE, isPrimary: true, sortOrder: 0 }],
        },
        specifications: {
          create: p.specs.map(([key, label, value, unit], i) => ({
            key,
            label,
            value,
            unit: unit || null,
            sortOrder: i,
          })),
        },
        documents: {
          create: [
            {
              title: `${p.name} Datasheet`,
              url: "https://example.com/datasheets/placeholder.pdf",
              type: "DATASHEET",
            },
          ],
        },
        inventory: {
          create: {
            quantityOnHand: 50,
            lowStockThreshold: 5,
            status: "IN_STOCK",
          },
        },
      },
      update: {},
    });
    createdProducts.push(product);
  }

  // A couple of related-product / accessory links for the first product.
  if (createdProducts.length > 2) {
    await prisma.productRelation.createMany({
      skipDuplicates: true,
      data: [
        {
          productId: createdProducts[0].id,
          relatedId: createdProducts[1].id,
          kind: "RELATED",
          sortOrder: 0,
        },
        {
          productId: createdProducts[0].id,
          relatedId: createdProducts[7].id,
          kind: "ACCESSORY",
          sortOrder: 0,
        },
      ],
    });
  }

  // --- Admin user (development only — change the password immediately) --------
  const adminEmail = "admin@pgmdirect.ie";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: "ADMIN" },
    });
    console.log(
      `\nCreated dev admin user: ${adminEmail} / ChangeMe123! — change this password immediately.\n`,
    );
  }

  console.log(
    `Seeded ${createdProducts.length} products across ${topLevel.length} top-level categories.`,
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
