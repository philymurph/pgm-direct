import { cableWiringSchema, cableWiringSvg, simpleHarnessSvg } from "./cable-wiring";
import { fullHarnessSvg } from "./full-harness-svg";

export function savedHarnessDrawing(name: string, value: unknown) {
  if (value === null) return null;
  const parsed = cableWiringSchema.safeParse(value);
  if (!parsed.success) return { success: false as const };

  const design = parsed.data;
  const svg = design.version === 4 ? fullHarnessSvg(name, design)
    : design.version === 3 ? simpleHarnessSvg(name, design)
      : cableWiringSvg(name, design);
  return { success: true as const, design, svg };
}
