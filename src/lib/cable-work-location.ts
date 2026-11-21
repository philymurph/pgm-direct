import type { CableWorkLocation } from "@prisma/client";

export const cableWorkLocationLabels = {
  LOUISE: "Louise",
  PGM: "PGM",
} satisfies Record<CableWorkLocation, string>;

export function summarizeCableWorkByLocation(
  work: { location: CableWorkLocation | null; cableName: string; quantity: number }[],
  transfers: { cableName: string; fromLocation: CableWorkLocation; toLocation: CableWorkLocation; quantity: number }[] = [],
) {
  const groups = new Map<CableWorkLocation | null, Map<string, number>>();
  function add(location: CableWorkLocation | null, cableName: string, quantity: number) {
    let cables = groups.get(location);
    if (!cables) {
      cables = new Map();
      groups.set(location, cables);
    }
    cables.set(cableName, (cables.get(cableName) ?? 0) + quantity);
  }
  for (const { location, cableName, quantity } of work) add(location, cableName, quantity);
  for (const { cableName, fromLocation, toLocation, quantity } of transfers) {
    add(fromLocation, cableName, -quantity);
    add(toLocation, cableName, quantity);
  }
  const locations: (CableWorkLocation | null)[] = ["LOUISE", "PGM"];
  if (groups.has(null)) locations.push(null);
  return locations.map((location) => {
    const cables = [...(groups.get(location) ?? new Map<string, number>())]
      .filter(([, quantity]) => quantity !== 0)
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
