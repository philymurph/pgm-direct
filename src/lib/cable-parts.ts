import type { CablePartKind } from "@prisma/client";
import { z } from "zod";
import { coreColoursSchema, type CoreColours } from "./core-colours";

export const cablePartLabels = {
  CONNECTOR: "Connector",
  CABLE_STOCK: "Cable stock",
} satisfies Record<CablePartKind, string>;

const partFields = {
  name: z.string().trim().min(1, "Enter a name.").max(40)
    .refine((value) => !/[\p{Cc}]/u.test(value), "Use a single line of text."),
  partNumber: z.string().trim().max(20).transform((number) => number || null),
};

export const cablePartSchema = z.discriminatedUnion("kind", [
  z.object({ ...partFields, kind: z.literal("CONNECTOR"), pinCount: z.string().regex(/^[1-9]\d*$/, "Enter the number of connector pins.").transform(Number).pipe(z.number().int().max(320)) }),
  z.object({ ...partFields, kind: z.literal("CABLE_STOCK"), cores: z.array(coreColoursSchema).min(1).max(40) }),
]);

const detailsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CONNECTOR"), pinCount: z.number().int().min(1).max(320) }),
  z.object({ kind: z.literal("CABLE_STOCK"), cores: z.array(coreColoursSchema).min(1).max(40) }),
]);

export type CablePartOption = {
  id: string;
  kind: CablePartKind;
  name: string;
  partNumber: string | null;
  pinCount: number | null;
  cores: CoreColours[] | null;
  imageId: string | null;
};

export function cablePartOption(part: {
  id: string; kind: CablePartKind; name: string; partNumber: string | null; details: unknown; currentImageId: string | null;
}): CablePartOption {
  if (part.details === null) return { ...part, imageId: part.currentImageId, pinCount: null, cores: null };
  const parsed = detailsSchema.safeParse(part.details);
  if (!parsed.success || parsed.data.kind !== part.kind) {
    throw new Error(`Invalid stored details for cable part ${part.id}.`);
  }
  return {
    id: part.id, kind: part.kind, name: part.name, partNumber: part.partNumber,
    imageId: part.currentImageId,
    pinCount: parsed.data.kind === "CONNECTOR" ? parsed.data.pinCount : null,
    cores: parsed.data.kind === "CABLE_STOCK" ? parsed.data.cores : null,
  };
}

