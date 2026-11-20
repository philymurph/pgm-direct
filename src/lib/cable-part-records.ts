import { Prisma, type CablePartKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { connectorPinTerminations, type SavedCableWiring } from "@/lib/cable-wiring";
import { partImageAuditSnapshot, recordCableAudit, type CableAuditActor } from "@/lib/cable-audit";

export async function saveCableWiringDesign(id: string, design: SavedCableWiring, actor: CableAuditActor) {
  const pinsPerCable = connectorPinTerminations(design);
  if (pinsPerCable === 0) return { error: "Map at least one connector pin before saving the drawing." };
  const { segments, ends } = design;
  const connectorIds = ends.flatMap((end) => "partId" in end && end.partId ? [end.partId] : []);
  const stockIds = segments.flatMap(({ stockPartId }) => stockPartId ? [stockPartId] : []);
  const ids = [...new Set([...connectorIds, ...stockIds])];
  return prisma.$transaction(async (tx) => {
    if (ids.length) {
      // Saving and deleting lock the same part rows before checking references.
      const parts = await tx.$queryRaw<{ id: string; kind: CablePartKind }[]>`
        SELECT "id", "kind" FROM "CablePart"
        WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE
      `;
      const kinds = new Map(parts.map(({ id, kind }) => [id, kind]));
      if (stockIds.some((stockId) => kinds.get(stockId) !== "CABLE_STOCK") ||
        connectorIds.some((partId) => kinds.get(partId) !== "CONNECTOR")) {
        return { error: "Select a valid cable stock part and connector parts from the library." };
      }
    }
    if (design.version === 4) {
      const selectedImages = [
        ...design.ends.flatMap((end) => end.type === "CONNECTOR" && end.imageId ? [{ partId: end.partId, imageId: end.imageId }] : []),
        ...design.segments.flatMap((segment) => segment.imageId ? [{ partId: segment.stockPartId, imageId: segment.imageId }] : []),
      ];
      if (selectedImages.length) {
        const images = await tx.cablePartImage.findMany({
          where: { id: { in: selectedImages.map(({ imageId }) => imageId) } }, select: { id: true, partId: true },
        });
        const owners = new Map(images.map(({ id, partId }) => [id, partId]));
        if (selectedImages.some(({ imageId, partId }) => owners.get(imageId) !== partId)) {
          return { error: "A selected image no longer belongs to its part. Choose the part image again." };
        }
      }
    }
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CableType" WHERE "id" = ${id} FOR UPDATE`;
    if (!locked.length) return { error: "Cable type no longer exists." };
    const before = await tx.cableType.findUniqueOrThrow({ where: { id } });
    const after = await tx.cableType.update({
      where: { id },
      data: { wiringDesign: design, pinsPerCable, pinCountFromDrawing: true },
    });
    await recordCableAudit(tx, actor, {
      action: before.wiringDesign === null ? "CREATE" : "UPDATE", entityType: "DRAWING",
      entityId: id, entityName: after.name,
      before: { wiringDesign: before.wiringDesign, pinsPerCable: before.pinsPerCable, pinCountFromDrawing: before.pinCountFromDrawing },
      after: { wiringDesign: after.wiringDesign, pinsPerCable: after.pinsPerCable, pinCountFromDrawing: after.pinCountFromDrawing },
    });
    return {};
  });
}

export async function deleteCablePart(id: string, actor: CableAuditActor) {
  return prisma.$transaction(async (tx) => {
    const parts = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "CablePart" WHERE "id" = ${id} FOR UPDATE
    `;
    if (!parts.length) return { count: 0 };
    const drawings = await tx.$queryRaw<{ name: string }[]>`
      SELECT "name" FROM "CableType"
      WHERE "wiringDesign" @> jsonb_build_object('stockPartId', ${id}::text)
         OR "wiringDesign" @> jsonb_build_object('ends', jsonb_build_array(jsonb_build_object('partId', ${id}::text)))
         OR "wiringDesign" @> jsonb_build_object('segments', jsonb_build_array(jsonb_build_object('stockPartId', ${id}::text)))
      ORDER BY "name" LIMIT 4
    `;
    if (drawings.length) {
      const names = drawings.slice(0, 3).map(({ name }) => name).join(", ");
      return { error: `This part is used in saved drawings: ${names}${drawings.length > 3 ? ", and others" : ""}. Remove it from those drawings and save them before deleting.` };
    }
    const before = await tx.cablePart.findUniqueOrThrow({ where: { id } });
    const images = await tx.cablePartImage.findMany({ where: { partId: id } });
    await tx.cablePart.delete({ where: { id } });
    await recordCableAudit(tx, actor, {
      action: "DELETE", entityType: "PART", entityId: id, entityName: before.name, before,
    });
    for (const image of images) {
      await recordCableAudit(tx, actor, {
        action: "DELETE", entityType: "ATTACHMENT", entityId: `${id}:IMAGE`,
        entityName: image.fileName, before: partImageAuditSnapshot(image),
      });
    }
    return { count: 1 };
  });
}
