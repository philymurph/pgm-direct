import type { CableWorkLocation, Prisma } from "@prisma/client";
import type { z } from "zod";
import { recordCableAudit, type CableAuditActor } from "@/lib/cable-audit";
import { cableWorkTotals, type cableTransferSchema, type cableWorkEditSchema } from "@/lib/cable-making";
import { prisma } from "@/lib/db";

async function lockLocations(tx: Prisma.TransactionClient) {
  // Serialize transfers and work reductions so concurrent changes cannot overdraw a location.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(1346850132, 1)`;
}

async function availableQuantity(tx: Prisma.TransactionClient, cableName: string, location: CableWorkLocation) {
  const [work, outgoing, incoming] = await Promise.all([
    tx.cableWork.aggregate({ where: { cableName, location }, _sum: { quantity: true } }),
    tx.cableTransfer.aggregate({ where: { cableName, fromLocation: location }, _sum: { quantity: true } }),
    tx.cableTransfer.aggregate({ where: { cableName, toLocation: location }, _sum: { quantity: true } }),
  ]);
  return (work._sum.quantity ?? 0) - (outgoing._sum.quantity ?? 0) + (incoming._sum.quantity ?? 0);
}

export async function recordCableTransfer(data: z.output<typeof cableTransferSchema>, actor: CableAuditActor) {
  return prisma.$transaction(async (tx) => {
    await lockLocations(tx);
    if (await availableQuantity(tx, data.cableName, data.fromLocation) < data.quantity) return false;
    const after = await tx.cableTransfer.create({ data: { ...data, actorId: actor.id, actorEmail: actor.email } });
    await recordCableAudit(tx, actor, { action: "CREATE", entityType: "TRANSFER", entityId: after.id, entityName: after.cableName, after });
    return true;
  });
}

export async function editCableWorkRecord(id: string, data: z.output<typeof cableWorkEditSchema>, actor: CableAuditActor) {
  return prisma.$transaction(async (tx) => {
    await lockLocations(tx);
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CableWork" WHERE "id" = ${id} FOR UPDATE`;
    if (!locked.length) return "missing";
    const before = await tx.cableWork.findUniqueOrThrow({ where: { id } });
    const removed = before.location === data.location ? before.quantity - data.quantity : before.quantity;
    if (before.location && removed > 0 && await availableQuantity(tx, before.cableName, before.location) < removed) return "transferred";
    const after = await tx.cableWork.update({ where: { id }, data: { ...data, ...cableWorkTotals(before, data.quantity) } });
    await recordCableAudit(tx, actor, { action: "UPDATE", entityType: "WORK", entityId: id, entityName: after.cableName, before, after });
    return "updated";
  });
}

export async function deleteCableWorkRecord(id: string, actor: CableAuditActor) {
  return prisma.$transaction(async (tx) => {
    await lockLocations(tx);
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CableWork" WHERE "id" = ${id} FOR UPDATE`;
    if (!locked.length) return "missing";
    const before = await tx.cableWork.findUniqueOrThrow({ where: { id } });
    if (before.location && await availableQuantity(tx, before.cableName, before.location) < before.quantity) return "transferred";
    await tx.cableWork.delete({ where: { id } });
    await recordCableAudit(tx, actor, { action: "DELETE", entityType: "WORK", entityId: id, entityName: before.cableName, before });
    return "deleted";
  });
}
