"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { cableAttachmentKinds, readCableAttachment } from "@/lib/cable-attachments";
import {
  cablePaymentSchema,
  cableTransferSchema,
  cableTypeSchema,
  cableWorkEditSchema,
  cableWorkSchema,
  snapshotCableWork,
} from "@/lib/cable-making";
import { prisma } from "@/lib/db";
import { cableWiringSchema } from "@/lib/cable-wiring";
import { cablePartSchema } from "@/lib/cable-parts";
import { deleteCablePart, saveCableWiringDesign } from "@/lib/cable-part-records";
import { attachmentAuditSnapshot, cableAuditActor, partImageAuditSnapshot, recordCableAudit } from "@/lib/cable-audit";
import { deleteCableWorkRecord, editCableWorkRecord, recordCableTransfer } from "@/lib/cable-transfers";

export interface CableFormState {
  error?: string;
  message?: string;
}

function saved(message: string): CableFormState {
  revalidatePath("/admin/cable-making");
  revalidatePath("/admin/cable-making/activity");
  return { message };
}

export async function saveCableWiring(id: string, input: unknown): Promise<CableFormState> {
  const session = await requireAdmin();
  if (!z.cuid().safeParse(id).success) return { error: "Invalid cable type." };
  const parsed = cableWiringSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const actor = await cableAuditActor(session.userId);
  const result = await saveCableWiringDesign(id, parsed.data, actor);
  if (result.error) return result;
  revalidatePath(`/admin/cable-making/${id}/creator`);
  return saved("Drawing saved. Pin terminations per harness updated for new work.");
}

export async function saveCablePart(id: string | null, _previous: CableFormState, data: FormData): Promise<CableFormState> {
  const session = await requireAdmin();
  if (id !== null && !z.cuid().safeParse(id).success) return { error: "Invalid part." };
  const image = await readCableAttachment("IMAGE", data.get("image"));
  if (image?.error) return { error: image.error };
  const removeImage = data.get("removeImage") === "on";
  if (removeImage && image?.file) return { error: "Choose either a new image or remove the current image." };
  const raw = Object.fromEntries(data);
  if (raw.kind === "CABLE_STOCK") {
    if (typeof raw.cores !== "string") return { error: "Enter the cable cores." };
    try {
      raw.cores = JSON.parse(raw.cores);
    } catch (error) {
      if (error instanceof SyntaxError) return { error: "Invalid cable core details." };
      throw error;
    }
  }
  const parsed = cablePartSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { kind, name, partNumber } = parsed.data;
  const details = parsed.data.kind === "CONNECTOR"
    ? { kind: "CONNECTOR" as const, pinCount: parsed.data.pinCount }
    : { kind: "CABLE_STOCK" as const, cores: parsed.data.cores };
  const actor = await cableAuditActor(session.userId);
  const result = await prisma.$transaction(async (tx) => {
    let before = null;
    let partId: string;
    if (id) {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CablePart" WHERE "id" = ${id} AND "kind" = ${kind}::"CablePartKind" FOR UPDATE`;
      if (!locked.length) return { error: "That part no longer exists." };
      before = await tx.cablePart.findUniqueOrThrow({ where: { id } });
      partId = id;
    } else {
      const created = await tx.cablePart.create({ data: { kind, name, partNumber, details } });
      partId = created.id;
    }
    const oldImage = before?.currentImageId
      ? await tx.cablePartImage.findUniqueOrThrow({ where: { id: before.currentImageId } }) : null;
    const newImage = image?.file ? await tx.cablePartImage.create({ data: {
      partId, fileName: image.file.fileName, contentType: image.file.contentType, data: image.file.data,
    } }) : null;
    const currentImageId = newImage?.id ?? (removeImage ? null : before?.currentImageId ?? null);
    const after = await tx.cablePart.update({ where: { id: partId }, data: { name, partNumber, details, currentImageId } });
    await recordCableAudit(tx, actor, {
      action: before ? "UPDATE" : "CREATE", entityType: "PART", entityId: partId, entityName: after.name,
      ...(before ? { before } : {}), after,
    });
    if (newImage || (removeImage && oldImage)) {
      await recordCableAudit(tx, actor, {
        action: newImage ? oldImage ? "UPDATE" : "CREATE" : "DELETE", entityType: "ATTACHMENT",
        entityId: `${partId}:IMAGE`, entityName: newImage?.fileName ?? oldImage!.fileName,
        ...(oldImage ? { before: partImageAuditSnapshot(oldImage) } : {}),
        ...(newImage ? { after: partImageAuditSnapshot(newImage) } : {}),
      });
    }
    return {};
  });
  if (result.error) return result;
  revalidatePath("/admin/cable-making/parts");
  revalidatePath("/admin/cable-making/[id]/creator", "page");
  revalidatePath("/admin/cable-making");
  revalidatePath("/admin/cable-making/activity");
  return { message: id ? "Part updated." : "Part added." };
}
export async function saveCableType(
  id: string | null, _prev: CableFormState, data: FormData,
): Promise<CableFormState> {
  const session = await requireAdmin();
  if (id !== null && !z.cuid().safeParse(id).success) return { error: "Invalid cable type" };
  const values = Object.fromEntries(data);
  if (!id) values.pinsPerCable = "1";
  const parsed = cableTypeSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [image, pdf] = await Promise.all(cableAttachmentKinds.map((kind) =>
    readCableAttachment(kind, data.get(kind)),
  ));
  for (const result of [image, pdf]) {
    if (result?.error) return { error: result.error };
  }

  const actor = await cableAuditActor(session.userId);
  try {
    const result = await prisma.$transaction(async (tx) => {
      let cableTypeId: string;
      if (id) {
        const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CableType" WHERE "id" = ${id} FOR UPDATE`;
        if (!locked.length) return { error: "Cable type not found" };
        const before = await tx.cableType.findUniqueOrThrow({ where: { id } });
        const updated = await tx.cableType.updateMany({
          where: { id, OR: [{ pinCountFromDrawing: false }, { pinsPerCable: parsed.data.pinsPerCable }] },
          data: parsed.data,
        });
        if (!updated.count) {
          const exists = await tx.cableType.findUnique({ where: { id }, select: { id: true } });
          return { error: exists
            ? "Pin terminations are calculated from the saved drawing. Refresh and try again."
            : "Cable type not found" };
        }
        cableTypeId = id;
        const after = await tx.cableType.findUniqueOrThrow({ where: { id } });
        await recordCableAudit(tx, actor, { action: "UPDATE", entityType: "HARNESS", entityId: id, entityName: after.name, before, after });
      } else {
        const created = await tx.cableType.create({ data: { ...parsed.data, requiresDrawing: true } });
        cableTypeId = created.id;
        await recordCableAudit(tx, actor, { action: "CREATE", entityType: "HARNESS", entityId: created.id, entityName: created.name, after: created });
      }
      for (const [kind, result] of [["IMAGE", image], ["PDF", pdf]] as const) {
        if (result?.file) {
          const before = await tx.cableAttachment.findUnique({ where: { cableTypeId_kind: { cableTypeId, kind } } });
          const after = await tx.cableAttachment.upsert({
            where: { cableTypeId_kind: { cableTypeId, kind } },
            create: { cableTypeId, ...result.file },
            update: result.file,
          });
          await recordCableAudit(tx, actor, {
            action: before ? "UPDATE" : "CREATE", entityType: "ATTACHMENT", entityId: `${cableTypeId}:${kind}`,
            entityName: after.fileName, ...(before ? { before: attachmentAuditSnapshot(before) } : {}), after: attachmentAuditSnapshot(after),
          });
        }
      }
      return {};
    });
    if (result.error) return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "A cable type already has that name" };
      if (error.code === "P2025") return { error: "Cable type not found" };
    }
    throw error;
  }
  return saved("Cable type saved.");
}

export async function recordCableWork(
  _prev: CableFormState, data: FormData,
): Promise<CableFormState> {
  const session = await requireAdmin();
  const parsed = cableWorkSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { cableTypeId, completedOn, quantity, location } = parsed.data;

  const actor = await cableAuditActor(session.userId);
  const recorded = await prisma.$transaction(async (tx) => {
    const cable = await tx.cableType.findUnique({ where: { id: cableTypeId } });
    if (!cable) return "missing";
    if (cable.requiresDrawing && !cable.pinCountFromDrawing) return "drawing";
    const after = await tx.cableWork.create({
      data: { cableTypeId, completedOn, location, ...snapshotCableWork(cable, quantity) },
    });
    await recordCableAudit(tx, actor, { action: "CREATE", entityType: "WORK", entityId: after.id, entityName: after.cableName, after });
    return "saved";
  });
  return recorded === "saved" ? saved("Completed batch recorded.") : {
    error: recorded === "drawing" ? "Save a harness drawing before recording work." : "Cable type not found",
  };
}

export async function editCableWork(
  id: string, _prev: CableFormState, data: FormData,
): Promise<CableFormState> {
  const session = await requireAdmin();
  if (!z.cuid().safeParse(id).success) return { error: "Invalid batch." };
  const parsed = cableWorkEditSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const actor = await cableAuditActor(session.userId);
  const updated = await editCableWorkRecord(id, parsed.data, actor);
  if (updated === "transferred") return { error: "This change would remove quantities that have already been transferred. Transfer them back first." };
  return updated === "updated" ? saved("Batch updated.") : { error: "Batch no longer exists." };
}

export async function saveCableTransfer(_prev: CableFormState, data: FormData): Promise<CableFormState> {
  const session = await requireAdmin();
  const parsed = cableTransferSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const actor = await cableAuditActor(session.userId);
  const recorded = await recordCableTransfer(parsed.data, actor);
  return recorded ? saved("Transfer recorded.") : { error: "The sending location does not have enough recorded cables. Refresh and try again." };
}

export async function saveCablePayment(
  id: string | null, _prev: CableFormState, data: FormData,
): Promise<CableFormState> {
  const session = await requireAdmin();
  if (id !== null && !z.cuid().safeParse(id).success) return { error: "Invalid payment." };
  const parsed = cablePaymentSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const actor = await cableAuditActor(session.userId);
  const updated = await prisma.$transaction(async (tx) => {
    if (id) {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CablePayment" WHERE "id" = ${id} FOR UPDATE`;
      if (!locked.length) return false;
      const before = await tx.cablePayment.findUniqueOrThrow({ where: { id } });
      const after = await tx.cablePayment.update({ where: { id }, data: parsed.data });
      await recordCableAudit(tx, actor, { action: "UPDATE", entityType: "PAYMENT", entityId: id, entityName: "Payment", before, after });
    } else {
      const after = await tx.cablePayment.create({ data: parsed.data });
      await recordCableAudit(tx, actor, { action: "CREATE", entityType: "PAYMENT", entityId: after.id, entityName: "Payment", after });
    }
    return true;
  });
  return updated ? saved(id ? "Payment updated." : "Payment recorded.") : { error: "Payment no longer exists." };
}

const deleteTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cable"), id: z.cuid() }),
  z.object({ type: z.literal("work"), id: z.cuid() }),
  z.object({ type: z.literal("payment"), id: z.cuid() }),
  z.object({ type: z.literal("attachment"), id: z.cuid(), kind: z.enum(cableAttachmentKinds) }),
  z.object({ type: z.literal("part"), id: z.cuid() }),
]);

export type CableDeleteTarget = z.infer<typeof deleteTargetSchema>;

export async function deleteCableRecord(target: CableDeleteTarget): Promise<CableFormState> {
  const session = await requireAdmin();
  const parsed = deleteTargetSchema.safeParse(target);
  if (!parsed.success) return { error: "Invalid record selection." };

  const { id } = parsed.data;
  const actor = await cableAuditActor(session.userId);
  if (parsed.data.type === "work") {
    const result = await deleteCableWorkRecord(id, actor);
    if (result === "transferred") return { error: "This batch includes quantities that have already been transferred. Transfer them back first." };
    return result === "deleted" ? saved("Record deleted.") : { error: "That record no longer exists." };
  }
  if (parsed.data.type === "part") {
    const result = await deleteCablePart(id, actor);
    if ("error" in result) return { error: result.error };
    if (!result.count) return { error: "That record no longer exists." };
    revalidatePath("/admin/cable-making/parts");
    revalidatePath("/admin/cable-making/[id]/creator", "page");
    return saved("Record deleted.");
  }
  const targetData = parsed.data;
  const deleted = await prisma.$transaction(async (tx) => {
    switch (targetData.type) {
      case "cable": {
        const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CableType" WHERE "id" = ${id} FOR UPDATE`;
        if (!locked.length) return false;
        const before = await tx.cableType.findUniqueOrThrow({ where: { id } });
        await tx.$queryRaw`SELECT "id" FROM "CableWork" WHERE "cableTypeId" = ${id} ORDER BY "id" FOR UPDATE`;
        const [attachments, work] = await Promise.all([
          tx.cableAttachment.findMany({ where: { cableTypeId: id } }),
          tx.cableWork.findMany({ where: { cableTypeId: id } }),
        ]);
        await tx.cableType.delete({ where: { id } });
        await recordCableAudit(tx, actor, { action: "DELETE", entityType: "HARNESS", entityId: id, entityName: before.name, before });
        if (before.wiringDesign !== null) {
          await recordCableAudit(tx, actor, {
            action: "DELETE", entityType: "DRAWING", entityId: id, entityName: before.name,
            before: { wiringDesign: before.wiringDesign, pinsPerCable: before.pinsPerCable, pinCountFromDrawing: before.pinCountFromDrawing },
          });
        }
        for (const attachment of attachments) {
          await recordCableAudit(tx, actor, {
            action: "DELETE", entityType: "ATTACHMENT", entityId: `${id}:${attachment.kind}`,
            entityName: attachment.fileName, before: attachmentAuditSnapshot(attachment),
          });
        }
        for (const batch of work) {
          await recordCableAudit(tx, actor, {
            action: "UPDATE", entityType: "WORK", entityId: batch.id, entityName: batch.cableName,
            before: batch, after: { ...batch, cableTypeId: null },
          });
        }
        return true;
      }
      case "payment": {
        const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CablePayment" WHERE "id" = ${id} FOR UPDATE`;
        if (!locked.length) return false;
        const before = await tx.cablePayment.delete({ where: { id } });
        await recordCableAudit(tx, actor, { action: "DELETE", entityType: "PAYMENT", entityId: id, entityName: "Payment", before });
        return true;
      }
      case "attachment": {
        await tx.$queryRaw`SELECT "id" FROM "CableType" WHERE "id" = ${id} FOR UPDATE`;
        const where = { cableTypeId_kind: { cableTypeId: id, kind: targetData.kind } };
        const before = await tx.cableAttachment.findUnique({ where });
        if (!before) return false;
        await tx.cableAttachment.delete({ where });
        await recordCableAudit(tx, actor, {
          action: "DELETE", entityType: "ATTACHMENT", entityId: `${id}:${before.kind}`,
          entityName: before.fileName, before: attachmentAuditSnapshot(before),
        });
        return true;
      }
    }
  });
  if (!deleted) {
    revalidatePath("/admin/cable-making");
    return { error: "That record no longer exists." };
  }
  return saved("Record deleted.");
}
