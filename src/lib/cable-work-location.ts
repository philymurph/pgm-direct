import type { CableWorkLocation } from "@prisma/client";

export const cableWorkLocationLabels = {
  LOUISE: "Louise",
  PGM: "PGM",
} satisfies Record<CableWorkLocation, string>;

export function summarizeCableWorkByLocation(
  work: { location: CableWorkLocation | null; cableName: string; quantity: number }[],
) {
  const groups = new Map<CableWorkLocation | null, Map<string, number>>();
  for (const { location, cableName, quantity } of work) {
    let cables = groups.get(location);
    if (!cables) {
      cables = new Map();
      groups.set(location, cables);
    }
    cables.set(cableName, (cables.get(cableName) ?? 0) + quantity);
  }
  const locations: (CableWorkLocation | null)[] = ["LOUISE", "PGM"];
  if (groups.has(null)) locations.push(null);
  return locations.map((location) => {
    const cables = [...(groups.get(location) ?? new Map<string, number>())]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => a.name.localeCompare(b.name, "en-IE"));
    return {
      location,
      label: location === null ? "Not set" : cableWorkLocationLabels[location],
      cables,
      total: cables.reduce((sum, cable) => sum + cable.quantity, 0),
    };
  });
}
