import { z } from "zod";

export const CORE_COLOURS = [
  { name: "Black", hex: "#171717" },
  { name: "Brown", hex: "#804000" },
  { name: "Red", hex: "#d00000" },
  { name: "Orange", hex: "#f47b20" },
  { name: "Yellow", hex: "#f4d400" },
  { name: "Green", hex: "#008641" },
  { name: "Blue", hex: "#1761c9" },
  { name: "Violet", hex: "#8438a5" },
  { name: "Grey", hex: "#808080" },
  { name: "White", hex: "#ffffff" },
  { name: "Pink", hex: "#ec79aa" },
  { name: "Turquoise", hex: "#00a8a8" },
] as const;

export const colourSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid colour.").transform((value) => value.toLowerCase());

export function validateCoreColours(
  core: { colour?: string; stripeColour?: string }, ctx: z.RefinementCtx, path: (string | number)[] = [],
) {
  if (core.stripeColour && !core.colour) {
    ctx.addIssue({ code: "custom", path: [...path, "stripeColour"], message: "Choose the main colour before adding a stripe." });
  } else if (core.colour && core.colour === core.stripeColour) {
    ctx.addIssue({ code: "custom", path: [...path, "stripeColour"], message: "Choose a stripe colour different from the main colour." });
  }
}

export const coreColoursSchema = z.object({
  colour: colourSchema.optional(),
  stripeColour: colourSchema.optional(),
}).superRefine((core, ctx) => validateCoreColours(core, ctx));

export type CoreColours = z.infer<typeof coreColoursSchema>;

export function coreColourName(colour?: string) {
  if (!colour || !/^#[0-9a-f]{6}$/i.test(colour)) return "Colour not specified";
  return CORE_COLOURS.find(({ hex }) => hex === colour.toLowerCase())?.name ?? `Custom ${colour.toUpperCase()}`;
}

export function coreColourDescription(colour?: string, stripeColour?: string) {
  const primary = coreColourName(colour);
  return stripeColour ? `${primary} / ${coreColourName(stripeColour)} stripe` : primary;
}
