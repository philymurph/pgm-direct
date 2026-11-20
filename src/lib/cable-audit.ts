import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CableAuditActor = { id: string; email: string };
type CableAuditEntity = "PART" | "HARNESS" | "DRAWING" | "WORK" | "PAYMENT" | "ATTACHMENT";
type CableAuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function cableAuditActor(userId: string): Promise<CableAuditActor> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, role: true } });
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return { id: user.id, email: user.email };
}

function snapshot(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item));
}

export function attachmentAuditSnapshot(attachment: {
  cableTypeId: string; kind: string; fileName: string; contentType: string; data: Uint8Array;
}) {
  return {
    cableTypeId: attachment.cableTypeId,
    kind: attachment.kind,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.data.byteLength,
    sha256: createHash("sha256").update(attachment.data).digest("hex"),
  };
}

export function partImageAuditSnapshot(image: {
  id: string; partId: string; fileName: string; contentType: string; data: Uint8Array;
}) {
  return {
    imageId: image.id, partId: image.partId, fileName: image.fileName, contentType: image.contentType,
    sizeBytes: image.data.byteLength, sha256: createHash("sha256").update(image.data).digest("hex"),
  };
}

export async function recordCableAudit(
  tx: Prisma.TransactionClient,
  actor: CableAuditActor,
  entry: {
    action: CableAuditAction; entityType: CableAuditEntity; entityId: string; entityName: string;
    before?: object; after?: object;
  },
) {
  await tx.cableAuditEntry.create({
    data: {
      actorId: actor.id, actorEmail: actor.email,
      action: entry.action, entityType: entry.entityType, entityId: entry.entityId, entityName: entry.entityName,
      ...(entry.before ? { before: snapshot(entry.before) } : {}),
      ...(entry.after ? { after: snapshot(entry.after) } : {}),
    },
  });
}
