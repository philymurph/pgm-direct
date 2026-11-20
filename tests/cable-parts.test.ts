import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../src/lib/db";
import { deleteCablePart as deletePart, saveCableWiringDesign as saveWiring } from "../src/lib/cable-part-records";
import { cableWiringSchema, type CableWiring, type SavedCableWiring } from "../src/lib/cable-wiring";
import { snapshotCableWork } from "../src/lib/cable-making";
import { cablePartOption, cablePartSchema } from "../src/lib/cable-parts";
import { fullHarnessSchema } from "../src/lib/full-harness";

const actor = { id: `test-${randomUUID()}`, email: "audit-test@example.invalid" };
const deleteCablePart = (id: string) => deletePart(id, actor);
const saveCableWiringDesign = (id: string, design: SavedCableWiring) => saveWiring(id, design, actor);

after(async () => {
  await prisma.cableAuditEntry.deleteMany({ where: { actorId: actor.id } });
  await prisma.$disconnect();
});

test("part definitions validate metadata and preserve legacy parts", () => {
  assert.equal(cablePartSchema.safeParse({ kind: "CONNECTOR", name: "Plug", partNumber: "", pinCount: "4" }).success, true);
  assert.equal(cablePartSchema.safeParse({ kind: "CONNECTOR", name: "Plug", partNumber: "", pinCount: "0" }).success, false);
  assert.equal(cablePartSchema.safeParse({ kind: "CABLE_STOCK", name: "Cable", partNumber: "", cores: [{ stripeColour: "#ffffff" }] }).success, false);
  const part = { id: "clh0000000000000000000001", kind: "CONNECTOR" as const, name: "Plug", partNumber: null, currentImageId: null };
  assert.equal(cablePartOption({ ...part, details: null }).pinCount, null);
  assert.throws(() => cablePartOption({ ...part, details: { kind: "CABLE_STOCK", cores: [] } }));
});

test("database rejects invalid cable rates, work totals and payment amounts", async () => {
  const data = await fixture();
  try {
    await assert.rejects(prisma.cableType.update({ where: { id: data.cable.id }, data: { ratePerPin: 0 } }), /CableType_positive_values/);
    await assert.rejects(prisma.cableWork.create({ data: {
      completedOn: new Date("2026-01-01"), cableTypeId: data.cable.id, cableName: "Test", quantity: 2,
      pinsPerCable: 2, totalPins: 3, ratePerPin: 1, earned: 3,
    } }), /CableWork_valid_totals/);
    await assert.rejects(prisma.cablePayment.create({ data: { paidOn: new Date("2026-01-01"), amount: 0 } }), /CablePayment_positive_amount/);
  } finally { await cleanup(data); }
});

test("full harness keeps part snapshots and protects both library references", async () => {
  const data = await fixture();
  try {
    const design = fullHarnessSchema.parse({
      version: 4,
      ends: [{ type: "CONNECTOR", name: "Original plug", partId: data.connector.id, pinCount: 2 }, { type: "BARE", name: "Bare" }],
      segments: [{ cableSpec: "Original cable", stockPartId: data.stock.id, from: 0, to: 1, lengthMm: 500,
        cores: [{ colour: "#1761c9", spare: false, from: "1", to: "Signal" }] }],
    });
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, design), {});
    await prisma.cablePart.update({ where: { id: data.connector.id }, data: { name: "Updated plug" } });
    await prisma.cablePart.update({ where: { id: data.stock.id }, data: { name: "Updated cable" } });
    const saved = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.deepEqual(saved.wiringDesign, JSON.parse(JSON.stringify(design)));
    assert.equal(saved.pinsPerCable, 1);
    assert.ok("error" in await deleteCablePart(data.connector.id));
    assert.ok("error" in await deleteCablePart(data.stock.id));
  } finally { await cleanup(data); }
});

test("saved harnesses keep their selected image versions and reject images from other parts", async () => {
  const data = await fixture();
  try {
    const first = await prisma.cablePartImage.create({ data: { partId: data.connector.id, fileName: "first.png", contentType: "image/png", data: Buffer.from("first") } });
    const second = await prisma.cablePartImage.create({ data: { partId: data.connector.id, fileName: "second.png", contentType: "image/png", data: Buffer.from("second") } });
    const cableImage = await prisma.cablePartImage.create({ data: { partId: data.stock.id, fileName: "cable.png", contentType: "image/png", data: Buffer.from("cable") } });
    await prisma.cablePart.update({ where: { id: data.connector.id }, data: { currentImageId: first.id } });
    const design = fullHarnessSchema.parse({
      version: 4, ends: [{ type: "CONNECTOR", name: "Plug", partId: data.connector.id, imageId: first.id, pinCount: 1 }, { type: "BARE", name: "Bare" }],
      segments: [{ cableSpec: "Cable", stockPartId: data.stock.id, imageId: cableImage.id, from: 0, to: 1, lengthMm: 10,
        cores: [{ spare: false, from: "1", to: "Signal" }] }],
    });
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, design), {});
    await prisma.cablePart.update({ where: { id: data.connector.id }, data: { currentImageId: second.id } });
    await prisma.cablePart.update({ where: { id: data.connector.id }, data: { currentImageId: null } });
    const saved = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.deepEqual(saved.wiringDesign, JSON.parse(JSON.stringify(design)));
    assert.ok(await prisma.cablePartImage.findUnique({ where: { id: first.id } }));
    const wrong = { ...design, segments: [{ ...design.segments[0], imageId: first.id }] };
    assert.match((await saveCableWiringDesign(data.cable.id, wrong)).error ?? "", /selected image/i);
    assert.deepEqual((await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } })).wiringDesign, JSON.parse(JSON.stringify(design)));
  } finally { await cleanup(data); }
});

test("drawing changes and part deletions are audited atomically with the actor", async () => {
  const data = await fixture();
  try {
    const design = wiring(data.connector.id, data.stock.id);
    await saveCableWiringDesign(data.cable.id, design);
    const entry = await prisma.cableAuditEntry.findFirstOrThrow({ where: { actorId: actor.id, entityId: data.cable.id } });
    assert.equal(entry.actorEmail, actor.email);
    assert.equal(entry.entityType, "DRAWING");
    assert.equal(entry.action, "CREATE");
    assert.deepEqual(entry.after, { wiringDesign: design, pinsPerCable: 1, pinCountFromDrawing: true });

    assert.ok("error" in await deleteCablePart(data.connector.id));
    assert.equal(await prisma.cableAuditEntry.count({ where: { actorId: actor.id, entityId: data.connector.id } }), 0);
    await saveCableWiringDesign(data.cable.id, wiring());
    await deleteCablePart(data.connector.id);
    const deletion = await prisma.cableAuditEntry.findFirstOrThrow({ where: { actorId: actor.id, entityId: data.connector.id } });
    assert.equal(deletion.action, "DELETE");
    assert.equal((deletion.before as { name: string }).name, data.connector.name);

    const brokenActor = { ...actor, email: "\u0000" };
    const changed = wiring();
    changed.segments[0].lengthMm = 321;
    await assert.rejects(saveWiring(data.cable.id, changed, brokenActor));
    const unchanged = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.deepEqual(unchanged.wiringDesign, wiring());
  } finally { await cleanup(data); }
});

async function fixture() {
  const suffix = randomUUID();
  return prisma.$transaction(async (tx) => {
    const connector = await tx.cablePart.create({ data: { kind: "CONNECTOR", name: `Test connector ${suffix}` } });
    const stock = await tx.cablePart.create({ data: { kind: "CABLE_STOCK", name: `Test stock ${suffix}` } });
    const cable = await tx.cableType.create({ data: { name: `Test cable ${suffix}`, pinsPerCable: 2 } });
    return { connector, stock, cable };
  });
}

function wiring(connectorId?: string, stockId?: string): CableWiring {
  return {
    version: 2,
    ends: [{ type: "CONNECTOR", name: "Plug A", ...(connectorId ? { partId: connectorId } : {}) }, { type: "BARE", name: "Loose wires" }],
    segments: [{ cableSpec: "Test stock", ...(stockId ? { stockPartId: stockId } : {}), from: 0, to: 1, lengthMm: 500 }],
    connections: [{ label: "Signal", terminals: [{ end: 0, pin: "1" }, { end: 1, pin: "2" }] }],
  };
}

async function cleanup({ connector, stock, cable }: Awaited<ReturnType<typeof fixture>>) {
  await prisma.cableType.deleteMany({ where: { id: cable.id } });
  await prisma.cablePart.deleteMany({ where: { id: { in: [connector.id, stock.id] } } });
}

test("parts in saved drawings cannot be deleted until their references are removed", async () => {
  const data = await fixture();
  try {
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, wiring(data.connector.id, data.stock.id)), {});
    for (const part of [data.connector, data.stock]) {
      const blocked = await deleteCablePart(part.id);
      assert.ok("error" in blocked);
      assert.ok(blocked.error?.includes(data.cable.name));
      assert.ok(await prisma.cablePart.findUnique({ where: { id: part.id } }));
    }

    assert.deepEqual(await saveCableWiringDesign(data.cable.id, wiring()), {});
    assert.deepEqual(await deleteCablePart(data.connector.id), { count: 1 });
    assert.deepEqual(await deleteCablePart(data.stock.id), { count: 1 });
    assert.deepEqual(await deleteCablePart(data.stock.id), { count: 0 });
    assert.ok((await saveCableWiringDesign(data.cable.id, wiring(data.connector.id))).error);
  } finally {
    await cleanup(data);
  }
});

test("concurrent drawing save and part deletion cannot leave a dangling reference", async () => {
  const data = await fixture();
  try {
    const [saved, deleted] = await Promise.all([
      saveCableWiringDesign(data.cable.id, wiring(data.connector.id)),
      deleteCablePart(data.connector.id),
    ]);
    const part = await prisma.cablePart.findUnique({ where: { id: data.connector.id } });
    const cable = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    if (part) {
      assert.equal(saved.error, undefined);
      assert.ok("error" in deleted);
      assert.deepEqual(cable.wiringDesign, wiring(data.connector.id));
    } else {
      assert.ok(saved.error);
      assert.deepEqual(deleted, { count: 1 });
      assert.equal(cable.wiringDesign, null);
    }
  } finally {
    await cleanup(data);
  }
});

test("legacy cable references remain protected before and after conversion", async () => {
  const data = await fixture();
  try {
    const legacy = {
      cableSpec: "Test stock", stockPartId: data.stock.id,
      ends: [{ name: "Plug A", partId: data.connector.id, lengthMm: 500 }, { name: "Plug B", lengthMm: 0 }],
      connections: [{ label: "Signal", terminals: [{ end: 0, pin: "1" }, { end: 1, pin: "2" }] }],
    };
    await prisma.cableType.update({ where: { id: data.cable.id }, data: { wiringDesign: legacy } });
    assert.ok("error" in await deleteCablePart(data.stock.id));
    const converted = cableWiringSchema.parse(legacy);
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, converted), {});
    assert.ok("error" in await deleteCablePart(data.stock.id));
    assert.ok("error" in await deleteCablePart(data.connector.id));
  } finally {
    await cleanup(data);
  }
});

test("every selected cable stock part is protected and checked for the right type", async () => {
  const data = await fixture();
  const second = await prisma.cablePart.create({ data: { kind: "CABLE_STOCK", name: `Test stock ${randomUUID()}` } });
  try {
    const design: CableWiring = {
      ...wiring(data.connector.id, data.stock.id),
      ends: [...wiring().ends, { type: "SPLICE", name: "Branch" }],
      segments: [
        { cableSpec: "Main", stockPartId: data.stock.id, from: 0, to: 2, lengthMm: 200 },
        { cableSpec: "Leg", stockPartId: second.id, from: 2, to: 1, lengthMm: 100 },
      ],
    };
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, design), {});
    assert.ok("error" in await deleteCablePart(second.id));
    const wrongKind = { ...design, segments: [...design.segments, { ...design.segments[0], stockPartId: data.connector.id }] };
    assert.ok((await saveCableWiringDesign(data.cable.id, wrongKind)).error);
  } finally {
    await cleanup(data);
    await prisma.cablePart.deleteMany({ where: { id: second.id } });
  }
});

test("saving a drawing updates future counts but preserves existing batches", async () => {
  const data = await fixture();
  const work = await prisma.cableWork.create({
    data: { cableTypeId: data.cable.id, completedOn: new Date("2026-11-20T00:00:00Z"),
      location: "PGM", ...snapshotCableWork(data.cable, 3) },
  });

  try {
    const design = wiring();
    await prisma.cableType.update({ where: { id: data.cable.id }, data: { wiringDesign: design } });
    const before = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.equal(before.pinsPerCable, 2);
    assert.equal(before.pinCountFromDrawing, false);

    assert.deepEqual(await saveCableWiringDesign(data.cable.id, design), {});
    const after = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.equal(after.pinsPerCable, 1);
    assert.equal(after.pinCountFromDrawing, true);
    assert.equal(snapshotCableWork(after, 3).earned.toFixed(2), "3.00");
    const savedWork = await prisma.cableWork.findUniqueOrThrow({ where: { id: work.id } });
    assert.equal(savedWork.pinsPerCable, 2);
    assert.equal(savedWork.totalPins, BigInt(6));
    assert.equal(savedWork.earned.toFixed(2), "6.00");

    const noConnectorPins: CableWiring = {
      ...design,
      ends: [...design.ends, { type: "SPLICE", name: "Splice" }],
      segments: [...design.segments, { cableSpec: "Branch", from: 1, to: 2, lengthMm: 100 }],
      connections: [{ label: "Signal", terminals: [{ end: 1, pin: "red" }, { end: 2, pin: "1" }] }],
    };
    assert.equal(cableWiringSchema.safeParse(noConnectorPins).success, true);
    assert.match((await saveCableWiringDesign(data.cable.id, noConnectorPins)).error ?? "", /at least one connector pin/);
    const unchanged = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.equal(unchanged.pinsPerCable, 1);
    assert.deepEqual(unchanged.wiringDesign, design);
  } finally {
    await prisma.cableWork.deleteMany({ where: { id: work.id } });
    await cleanup(data);
  }
});

test("simple build sheets retain core labels and protect selected library parts", async () => {
  const data = await fixture();
  try {
    const design = cableWiringSchema.parse({
      version: 3,
      ends: [{ type: "CONNECTOR", name: "Plug", partId: data.connector.id, pinCount: 4 }, { type: "BARE", name: "Bare wires" }],
      segments: [{ cableSpec: "4-core", stockPartId: data.stock.id, from: 0, to: 1, lengthMm: 500 }],
      cores: [
        { core: "Blue", colour: "#1761c9", stripeColour: "#ffffff", pin: "1", printedLabel: "Signal", spare: false },
        { core: "Red", colour: "#d00000", pin: "2", printedLabel: "Power", spare: false },
        { core: "Black", pin: "3", printedLabel: "Return", spare: false },
        { core: "White", pin: "", printedLabel: "", spare: true },
      ],
    });
    assert.deepEqual(await saveCableWiringDesign(data.cable.id, design), {});
    const saved = await prisma.cableType.findUniqueOrThrow({ where: { id: data.cable.id } });
    assert.deepEqual(saved.wiringDesign, design);
    assert.equal(saved.pinsPerCable, 3);
    assert.equal(saved.pinCountFromDrawing, true);
    assert.ok("error" in await deleteCablePart(data.connector.id));
    assert.ok("error" in await deleteCablePart(data.stock.id));
  } finally {
    await cleanup(data);
  }
});
