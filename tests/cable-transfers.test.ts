import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../src/lib/db";
import { deleteCableWorkRecord, editCableWorkRecord, recordCableTransfer } from "../src/lib/cable-transfers";

const actor = { id: `transfer-test-${randomUUID()}`, email: "transfer-test@example.invalid" };
const cableName = `Transfer test ${randomUUID()}`;

after(async () => {
  await prisma.cableAuditEntry.deleteMany({ where: { actorId: actor.id } });
  await prisma.cableTransfer.deleteMany({ where: { actorId: actor.id } });
  await prisma.cableWork.deleteMany({ where: { cableName } });
  await prisma.$disconnect();
});

test("transfers are atomic, limited, audited, and protect work from negative location totals", async () => {
  const work = await prisma.cableWork.create({ data: {
    cableName, location: "LOUISE", completedOn: new Date("2026-01-01"), quantity: 10,
    pinsPerCable: 1, totalPins: BigInt(10), ratePerPin: 1, earned: 10,
  } });
  const transfer = { cableName, fromLocation: "LOUISE" as const, toLocation: "PGM" as const, quantity: 7 };
  const results = await Promise.all([recordCableTransfer(transfer, actor), recordCableTransfer(transfer, actor)]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(await prisma.cableTransfer.count({ where: { actorId: actor.id } }), 1);
  assert.equal(await prisma.cableAuditEntry.count({ where: { actorId: actor.id, entityType: "TRANSFER" } }), 1);
  assert.equal(await recordCableTransfer({ ...transfer, quantity: 4 }, actor), false);

  const edit = { completedOn: work.completedOn, location: "LOUISE" as const, quantity: 2 };
  assert.equal(await editCableWorkRecord(work.id, edit, actor), "transferred");
  assert.equal(await editCableWorkRecord(work.id, { ...edit, location: "PGM", quantity: 10 }, actor), "transferred");
  assert.equal(await deleteCableWorkRecord(work.id, actor), "transferred");
  assert.equal((await prisma.cableWork.findUniqueOrThrow({ where: { id: work.id } })).quantity, 10);

  assert.equal(await recordCableTransfer({ ...transfer, fromLocation: "PGM", toLocation: "LOUISE" }, actor), true);
  assert.equal(await editCableWorkRecord(work.id, edit, actor), "updated");
  assert.equal(await deleteCableWorkRecord(work.id, actor), "deleted");

  const second = await prisma.cableWork.create({ data: {
    cableName, location: "LOUISE", completedOn: new Date("2026-01-01"), quantity: 10,
    pinsPerCable: 1, totalPins: BigInt(10), ratePerPin: 1, earned: 10,
  } });
  const [moved, edited] = await Promise.all([
    recordCableTransfer(transfer, actor),
    editCableWorkRecord(second.id, edit, actor),
  ]);
  assert.ok((moved && edited === "transferred") || (!moved && edited === "updated"));
});
