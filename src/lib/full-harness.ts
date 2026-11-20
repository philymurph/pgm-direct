import { z } from "zod";
import { colourSchema, validateCoreColours } from "./core-colours";

const label = (max: number) => z.string().trim().min(1).max(max)
  .refine((value) => !/[\p{Cc}]/u.test(value), "Use a single line of text.");

export const fullHarnessSchema = z.object({
  version: z.literal(4),
  ends: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("CONNECTOR"), name: label(40), partId: z.cuid(), imageId: z.cuid().optional(), partNumber: label(20).optional(), pinCount: z.number().int().min(1).max(320) }),
    z.object({ type: z.literal("BARE"), name: label(40) }),
    z.object({ type: z.literal("SPLICE"), name: label(40) }),
  ])).min(2).max(16),
  segments: z.array(z.object({
    cableSpec: label(64), stockPartId: z.cuid(), imageId: z.cuid().optional(), partNumber: label(20).optional(),
    from: z.number().int().nonnegative(), to: z.number().int().nonnegative(),
    lengthMm: z.number().int().positive().max(1_000_000),
    cores: z.array(z.object({
      colour: colourSchema.optional(), stripeColour: colourSchema.optional(),
      spare: z.boolean(), from: z.string().trim().max(40), to: z.string().trim().max(40),
    })).min(1).max(40),
  })).min(1).max(32),
}).superRefine(({ ends, segments }, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (!ends.some((end) => end.type === "CONNECTOR")) issue(["ends"], "Add at least one connector.");
  const adjacent = ends.map(() => new Set<number>());
  const usedPins = new Set<string>();
  const spliceGroups = new Map<string, number>();
  let terminations = 0;
  segments.forEach((segment, index) => {
    const path = ["segments", index] as (string | number)[];
    if (!Number.isInteger(segment.from) || !Number.isInteger(segment.to) || segment.from < 0 || segment.to < 0 ||
      segment.from >= ends.length || segment.to >= ends.length || segment.from === segment.to) {
      issue(path, `Cable ${index + 1}: choose two different existing ends.`);
      return;
    }
    adjacent[segment.from].add(segment.to);
    adjacent[segment.to].add(segment.from);
    segment.cores.forEach((core, coreIndex) => {
      const corePath = [...path, "cores", coreIndex];
      validateCoreColours(core, ctx, corePath);
      if (core.spare) {
        if (core.from || core.to) issue(corePath, `Cable ${index + 1}, core ${coreIndex + 1}: spare cores cannot have connections.`);
        return;
      }
      for (const [side, endIndex] of [["from", segment.from], ["to", segment.to]] as const) {
        const end = ends[endIndex];
        const value = core[side];
        if (!value || /[\p{Cc}]/u.test(value)) {
          issue([...corePath, side], `Cable ${index + 1}, core ${coreIndex + 1}: enter a connection at ${end.name}.`);
        } else if (end.type === "CONNECTOR") {
          const pin = Number(value);
          if (!/^[1-9]\d*$/.test(value) || pin > end.pinCount) {
            issue([...corePath, side], `Cable ${index + 1}, core ${coreIndex + 1}: choose a pin from 1 to ${end.pinCount} at ${end.name}.`);
          } else {
            const key = `${endIndex}:${pin}`;
            if (usedPins.has(key)) issue([...corePath, side], `Pin ${pin} at ${end.name} is already used.`);
            usedPins.add(key);
            terminations++;
          }
        } else if (end.type === "SPLICE") {
          const key = `${endIndex}:${value.toUpperCase()}`;
          spliceGroups.set(key, (spliceGroups.get(key) ?? 0) + 1);
        }
      }
    });
  });
  if (adjacent.some((neighbours) => neighbours.size === 0)) issue(["segments"], "Connect every end to a cable.");
  else if (ends.length) {
    const reached = new Set([0]);
    const queue = [0];
    for (const index of queue) for (const next of adjacent[index]) {
      if (!reached.has(next)) { reached.add(next); queue.push(next); }
    }
    if (reached.size !== ends.length) issue(["segments"], "All cables must form one connected harness.");
  }
  if ([...spliceGroups.values()].some((count) => count < 2)) {
    issue(["segments"], "Each splice group must join at least two core ends at the same splice.");
  }
  if (!terminations) issue(["segments"], "Connect at least one core to a connector pin.");
});

export type FullHarness = z.infer<typeof fullHarnessSchema>;
