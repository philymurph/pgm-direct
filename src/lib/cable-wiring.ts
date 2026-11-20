import { z } from "zod";
import { colourSchema, coreColourDescription, validateCoreColours } from "./core-colours";
import { fullHarnessSchema } from "./full-harness";

export const MAX_ENDPOINTS = 16;
export const MAX_SEGMENTS = 32;
export const MAX_CONNECTIONS = 40;
export const MAX_TERMINALS = 8;

const label = (max: number) => z.string().trim().min(1).max(max)
  .refine((value) => !/[\p{Cc}]/u.test(value), "Use a single line of text.");

const connectionsSchema = z.array(z.object({
  label: label(40),
  terminals: z.array(z.object({
    end: z.number().int().nonnegative(),
    pin: label(16),
  })).min(2).max(MAX_TERMINALS),
})).min(1).max(MAX_CONNECTIONS);

function validateConnections(
  ends: { name: string }[],
  connections: z.infer<typeof connectionsSchema>,
  ctx: z.RefinementCtx,
) {
  const usedPins = new Set<string>();
  connections.forEach(({ terminals }, index) => {
    for (const { end, pin } of terminals) {
      if (end >= ends.length) {
        ctx.addIssue({ code: "custom", path: ["connections", index], message: `Connection ${index + 1} references a missing endpoint.` });
        continue;
      }
      const key = `${end}:${pin.toUpperCase()}`;
      if (usedPins.has(key)) {
        ctx.addIssue({
          code: "custom", path: ["connections", index],
          message: `Endpoint ${endLetter(end)}, pin ${pin} is listed more than once. Put all pins that share a connection on one row.`,
        });
      }
      usedPins.add(key);
    }
  });
}

const legacyCableWiringSchema = z.object({
  version: z.never().optional(),
  cableSpec: label(64),
  stockPartId: z.cuid().optional(),
  ends: z.array(z.object({
    name: label(40),
    partId: z.cuid().optional(),
    lengthMm: z.number().int().nonnegative().max(1_000_000),
  })).min(2).max(8),
  connections: connectionsSchema,
}).superRefine(({ ends, connections }, ctx) => {
  ends.forEach(({ lengthMm }, index) => {
    if (ends.length === 2 && index === 1 ? lengthMm !== 0 : lengthMm === 0) {
      ctx.addIssue({ code: "custom", path: ["ends", index, "lengthMm"], message: "Enter the cable length or each branch length in millimetres." });
    }
  });
  validateConnections(ends, connections, ctx);
});

export const harnessWiringSchema = z.object({
  version: z.literal(2),
  ends: z.array(z.object({
    type: z.enum(["CONNECTOR", "BARE", "SPLICE"]),
    name: label(40),
    partId: z.cuid().optional(),
  })).min(2).max(MAX_ENDPOINTS),
  segments: z.array(z.object({
    cableSpec: label(64),
    stockPartId: z.cuid().optional(),
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
    lengthMm: z.number().int().positive().max(1_000_000),
  })).min(1).max(MAX_SEGMENTS),
  connections: connectionsSchema,
}).superRefine(({ ends, segments, connections }, ctx) => {
  if (!ends.some((end) => end.type === "CONNECTOR")) {
    ctx.addIssue({ code: "custom", path: ["ends"], message: "Add at least one connector." });
  }
  ends.forEach((end, index) => {
    if (end.type !== "CONNECTOR" && end.partId) {
      ctx.addIssue({ code: "custom", path: ["ends", index], message: "Only connectors can have a connector part." });
    }
  });
  const adjacent = ends.map(() => new Set<number>());
  segments.forEach((segment, index) => {
    if (!Number.isInteger(segment.from) || !Number.isInteger(segment.to) ||
      segment.from < 0 || segment.to < 0 ||
      segment.from >= ends.length || segment.to >= ends.length || segment.from === segment.to) {
      ctx.addIssue({ code: "custom", path: ["segments", index], message: "Choose two different existing endpoints." });
    } else {
      adjacent[segment.from].add(segment.to);
      adjacent[segment.to].add(segment.from);
    }
  });
  if (adjacent.every((neighbours) => neighbours.size > 0)) {
    const reached = new Set([0]);
    const queue = [0];
    for (const index of queue) {
      for (const next of adjacent[index]) {
        if (!reached.has(next)) { reached.add(next); queue.push(next); }
      }
    }
    if (reached.size !== ends.length) {
      ctx.addIssue({ code: "custom", path: ["segments"], message: "All cable segments must form one connected harness." });
    }
  } else {
    ctx.addIssue({ code: "custom", path: ["segments"], message: "Connect every endpoint to a cable segment." });
  }
  validateConnections(ends, connections, ctx);
});

export const simpleHarnessSchema = z.object({
  version: z.literal(3),
  ends: z.tuple([
    z.object({
      type: z.literal("CONNECTOR"),
      name: label(40),
      partId: z.cuid().optional(),
      partNumber: label(20).optional(),
      pinCount: z.number().int().min(1).max(320),
    }),
    z.object({ type: z.literal("BARE"), name: z.literal("Bare wires") }),
  ]),
  segments: z.tuple([z.object({
    cableSpec: label(64),
    stockPartId: z.cuid().optional(),
    partNumber: label(20).optional(),
    from: z.literal(0),
    to: z.literal(1),
    lengthMm: z.number().int().positive().max(1_000_000),
  })]),
  cores: z.array(z.object({
    core: label(40),
    colour: colourSchema.optional(),
    stripeColour: colourSchema.optional(),
    spare: z.boolean(),
    pin: z.string().trim().max(16).refine((value) => !/[\p{Cc}]/u.test(value), "Use a single line of text."),
    printedLabel: z.string().trim().max(40).refine((value) => !/[\p{Cc}]/u.test(value), "Use a single line of text."),
  })).min(1).max(40),
}).superRefine(({ ends, cores }, ctx) => {
  const coreNames = new Set<string>();
  const pins = new Set<string>();
  cores.forEach((core, index) => {
    const key = core.core.toUpperCase();
    if (coreNames.has(key)) {
      ctx.addIssue({ code: "custom", path: ["cores", index, "core"], message: "Each core identifier must be different." });
    }
    coreNames.add(key);
    validateCoreColours(core, ctx, ["cores", index]);
    if (core.spare) {
      if (core.pin || core.printedLabel) {
        ctx.addIssue({ code: "custom", path: ["cores", index], message: "Spare cores cannot have a pin or printed label." });
      }
    } else {
      if (!core.pin || !core.printedLabel) {
        ctx.addIssue({ code: "custom", path: ["cores", index], message: "Enter a connector pin and printed label, or mark this core as spare." });
      }
      const pin = core.pin.toUpperCase();
      if (pin && pins.has(pin)) {
        ctx.addIssue({ code: "custom", path: ["cores", index, "pin"], message: "A connector pin can only be used once." });
      }
      if (pin) pins.add(pin);
    }
  });
  if (pins.size === 0) {
    ctx.addIssue({ code: "custom", path: ["cores"], message: "Connect at least one core to a connector pin." });
  }
  if (pins.size > ends[0].pinCount) {
    ctx.addIssue({ code: "custom", path: ["cores"], message: "The number of connected pins exceeds the connector's pin count." });
  }
});

export const cableWiringSchema = z.union([
  fullHarnessSchema,
  harnessWiringSchema,
  simpleHarnessSchema,
  legacyCableWiringSchema.transform(({ cableSpec, stockPartId, ends, connections }): z.infer<typeof harnessWiringSchema> => {
    const branch = ends.length > 2;
    return {
      version: 2 as const,
      ends: [
        ...ends.map(({ name, partId }) => ({ type: "CONNECTOR" as const, name, ...(partId ? { partId } : {}) })),
        ...(branch ? [{ type: "SPLICE" as const, name: "Branch point" }] : []),
      ],
      segments: (branch ? ends : [ends[0]]).map((end, index) => ({
        cableSpec, ...(stockPartId ? { stockPartId } : {}),
        from: branch ? index : 0, to: branch ? ends.length : 1, lengthMm: end.lengthMm,
      })),
      connections,
    };
  }).pipe(harnessWiringSchema),
]);

export type CableWiring = z.infer<typeof harnessWiringSchema>;
export type SimpleHarness = z.infer<typeof simpleHarnessSchema>;
export type SavedCableWiring = z.infer<typeof cableWiringSchema>;
export type CableTerminal = CableWiring["connections"][number]["terminals"][number];

export function connectorPinTerminations(design: SavedCableWiring) {
  if (design.version === 3) return design.cores.filter((core) => !core.spare).length;
  if (design.version === 4) return design.segments.reduce((total, segment) =>
    total + segment.cores.filter((core) => !core.spare).length *
      Number(design.ends[segment.from].type === "CONNECTOR") +
      segment.cores.filter((core) => !core.spare).length * Number(design.ends[segment.to].type === "CONNECTOR"), 0);
  return design.connections.reduce((total, connection) =>
    total + connection.terminals.filter(({ end }) => design.ends[end]?.type === "CONNECTOR").length, 0);
}

export function endLetter(index: number) {
  return String.fromCharCode(65 + index);
}

export function sameCableTerminal(a: CableTerminal, b: CableTerminal) {
  return a.end === b.end && a.pin.trim().toUpperCase() === b.pin.trim().toUpperCase();
}

export function connectCableTerminals(design: CableWiring, first: CableTerminal, second: CableTerminal):
  { design: CableWiring; message: string } | { error: string } {
  if ([first, second].some(({ end, pin }) =>
    !Number.isInteger(end) || end < 0 || end >= design.ends.length ||
    !pin.trim() || pin.trim().length > 16 || /[\p{Cc}]/u.test(pin))) {
    return { error: "Choose two valid pins." };
  }
  if (sameCableTerminal(first, second)) return { error: "Choose two different pins." };
  const memberships = (terminal: CableTerminal) => design.connections.flatMap((connection, index) =>
    connection.terminals.filter((pin) => pin.pin.trim() && sameCableTerminal(pin, terminal)).map(() => index),
  );
  const firstGroups = memberships(first);
  const secondGroups = memberships(second);
  if (firstGroups.length > 1 || secondGroups.length > 1) {
    return { error: "A pin is listed more than once. Correct the manual wiring first." };
  }
  const a = firstGroups[0];
  const b = secondGroups[0];
  if (a !== undefined && b !== undefined) {
    return { error: a === b
      ? "These pins are already connected."
      : "Both pins belong to different connections. Edit the manual wiring to change them." };
  }
  const existing = a ?? b;
  if (existing !== undefined) {
    const connection = design.connections[existing];
    if (connection.terminals.length >= MAX_TERMINALS) return { error: "This connection already has the maximum of 8 pins." };
    const pin = a === undefined ? first : second;
    return {
      design: { ...design, connections: design.connections.map((item, index) =>
        index === existing ? { ...item, terminals: [...item.terminals, pin] } : item) },
      message: `Pin added to connection ${existing + 1}.`,
    };
  }
  const placeholder = design.connections.length === 1 && design.connections[0].label === "Wire 1" &&
    design.connections[0].terminals.length === 2 &&
    design.connections[0].terminals.every(({ pin, end }, index) => !pin && end === index);
  if (!placeholder && design.connections.length >= MAX_CONNECTIONS) return { error: "The maximum of 40 connections has been reached." };
  const index = placeholder ? 0 : design.connections.length;
  const connection = { label: `Wire ${index + 1}`, terminals: [first, second] };
  return {
    design: { ...design, connections: placeholder ? [connection] : [...design.connections, connection] },
    message: `Connection ${index + 1} added.`,
  };
}

export function escapeXml(text: string) {
  return text.replace(/[\p{Cc}\uFFFE\uFFFF]/gu, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export function simpleHarnessSvg(name: string, design: SimpleHarness) {
  const width = CABLE_WIRING_WIDTH;
  const height = 370 + design.cores.length * 52;
  const text = (x: number, y: number, value: string, size = 16, weight = 400) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
  const fittedText = (x: number, y: number, value: string, maxWidth: number) =>
    `<text x="${x}" y="${y}" font-size="15" font-weight="700" textLength="${Math.min(maxWidth, Array.from(value).length * 9)}" lengthAdjust="spacingAndGlyphs">${escapeXml(value)}</text>`;
  const title = Array.from(name).slice(0, 100).join("");
  const titleLines = Array.from(title.matchAll(/.{1,75}/gu), ([part]) => part);
  const rows = design.cores.map((core, index) => {
    const y = 310 + index * 52;
    const colour = core.colour && /^#[0-9a-f]{6}$/i.test(core.colour) ? core.colour : undefined;
    const stripe = core.stripeColour && /^#[0-9a-f]{6}$/i.test(core.stripeColour) ? core.stripeColour : undefined;
    const wire = `<line x1="370" y1="${y - 5}" x2="1050" y2="${y - 5}" stroke="#475569" stroke-width="9"${core.spare || !colour ? ' stroke-dasharray="16 6"' : ""}/>` +
      (colour ? `<line x1="370" y1="${y - 5}" x2="1050" y2="${y - 5}" stroke="${colour}" stroke-width="6"${core.spare ? ' stroke-dasharray="16 6"' : ""}/>` : "") +
      (colour && stripe ? `<line x1="370" y1="${y - 5}" x2="1050" y2="${y - 5}" stroke="${stripe}" stroke-width="6" stroke-dasharray="${core.spare ? "7 15" : "14 14"}"/>` : "");
    const coreDetails = `<rect x="445" y="${y - 25}" width="400" height="43" fill="${index % 2 ? "#f8fafc" : "#fff"}"/>` +
      fittedText(455, y - 5, core.core || "Core not set", 380) +
      text(455, y + 13, coreColourDescription(core.colour, core.stripeColour), 11);
    return `<rect x="36" y="${y - 28}" width="1328" height="48" fill="${index % 2 ? "#f8fafc" : "#fff"}"/>` +
      (core.spare
        ? text(55, y, "SPARE", 15, 700) +
          wire + coreDetails +
          text(1070, y, "Not connected / no label", 14)
        : text(55, y, core.pin ? `Pin ${core.pin}` : "Pin not set", 15, 700) +
          wire + coreDetails +
          fittedText(1070, y, core.printedLabel || "Label not set", 280));
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">` +
    `<title>${escapeXml(name)} harness build sheet</title><rect width="100%" height="100%" fill="#fff"/>` +
    `<rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#64748b"/>` +
    `<g font-family="ui-monospace, monospace" fill="#1e293b">` +
    titleLines.map((part, i) => text(40, 48 + i * 22, part, 20, 700)).join("") +
    text(40, 112, "CONNECTOR", 14, 700) +
    text(40, 140, design.ends[0].name || "Connector not set", 16, 700) +
    text(40, 165, design.ends[0].pinCount ? `${design.ends[0].pinCount} pin positions` : "Pin count not set", 14) +
    (design.ends[0].partNumber ? text(40, 190, `Part no: ${design.ends[0].partNumber}`, 13) : "") +
    text(500, 112, "CABLE", 14, 700) +
    text(500, 140, design.segments[0].cableSpec || "Cable not set", 16, 700) +
    text(500, 165, `${design.cores.length} cores  /  Cut length: ${design.segments[0].lengthMm ? `${design.segments[0].lengthMm} mm` : "not set"}`, 14) +
    (design.segments[0].partNumber ? text(500, 190, `Part no: ${design.segments[0].partNumber}`, 13) : "") +
    `<rect x="32" y="205" width="1336" height="34" fill="#e2e8f0" stroke="#64748b"/>` +
    text(46, 228, "WIRE-BY-WIRE BUILD INSTRUCTIONS", 14, 700) +
    text(55, 267, "CONNECTOR PIN", 13, 700) +
    text(455, 267, "CABLE CORE / COLOUR", 13, 700) +
    text(1070, 267, "PRINT THIS LABEL", 13, 700) +
    rows + text(40, height - 33, "Colours are shown only when selected. Spare cores are not connected.", 12) +
    "</g></svg>";
}

export function cableWiringSvg(name: string, design: CableWiring) {
  const width = CABLE_WIRING_WIDTH;
  const text = (x: number, y: number, value: string, size = 14, weight = 400, fill = "#1e293b") =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1"/>`;
  const colours = ["#2563eb", "#b91c1c", "#047857", "#7e22ce", "#b45309", "#0e7490", "#be185d", "#334155"];
  const pins = design.ends.map((_, end) =>
    design.connections.flatMap((connection, net) =>
      connection.terminals.filter((terminal) => terminal.end === end).map((terminal) => ({ pin: terminal.pin, net })),
    ),
  );
  const header = (x: number, y: number, heading: string) =>
    `<rect x="${x}" y="${y}" width="${width - 64}" height="28" fill="#e2e8f0" stroke="#64748b"/>` +
    text(x + 10, y + 19, heading, 13, 700);
  const connectors = design.ends.map((end, index) => {
    const height = 88 + Math.max(pins[index].length, 1) * 25;
    return { end, index, height };
  });
  const leftHeight = connectors[0].height;
  let rightHeight = 0;
  for (const connector of connectors.slice(1)) {
    rightHeight = Math.ceil(rightHeight / 25) * 25 + connector.index * 2 + connector.height + 16;
  }
  rightHeight -= 16;
  const segmentsY = 158 + design.ends.length * 28;
  const assemblyY = segmentsY + 100 + design.segments.length * 82;
  const diagramY = assemblyY + 68;
  const assemblyHeight = 112 + Math.max(leftHeight, rightHeight);
  const scheduleY = assemblyY + assemblyHeight + 20;
  const scheduleHeight = 42 + design.connections.reduce((sum, net) => sum + 32 + net.terminals.length * 21, 0);
  const height = scheduleY + scheduleHeight + 64;

  const partRows = design.ends.map((end, index) => {
    const type = end.type === "CONNECTOR" ? "Connector" : end.type === "BARE" ? "Bare wires" : "Branch / splice";
    const y = 143 + index * 28;
    return text(46, y, endLetter(index), 13, 700) + text(96, y, end.name, 13) + text(610, y, type, 13);
  }).join("");
  const segmentRows = design.segments.map((segment, index) => {
    const y = segmentsY + 75 + index * 82;
    return text(46, y, `C${String(index + 1).padStart(2, "0")}`, 13, 700) +
      text(100, y, segment.cableSpec, 13, 700) + text(1000, y, `${segment.lengthMm} mm`, 13) +
      `<rect x="100" y="${y + 12}" width="310" height="32" fill="#f8fafc" stroke="#64748b"/>` +
      `<rect x="950" y="${y + 12}" width="310" height="32" fill="#f8fafc" stroke="#64748b"/>` +
      `<line x1="410" y1="${y + 28}" x2="950" y2="${y + 28}" stroke="#334155" stroke-width="3"/>` +
      text(110, y + 33, `${endLetter(segment.from)}  ${design.ends[segment.from].name}`, 12) +
      text(960, y + 33, `${endLetter(segment.to)}  ${design.ends[segment.to].name}`, 12);
  }).join("");

  let rightY = diagramY;
  const points: { x: number; y: number; net: number }[] = [];
  const blocks = connectors.map(({ end, index, height: blockHeight }) => {
    const isLeft = index === 0;
    const x = isLeft ? 56 : width - 368;
    const y = isLeft ? diagramY : diagramY + Math.ceil((rightY - diagramY) / 25) * 25 + index * 2;
    if (!isLeft) rightY = y + blockHeight + 16;
    const anchorX = isLeft ? x + 312 : x;
    const entries = pins[index].map(({ pin, net }, row) => {
      const py = y + 83 + row * 25;
      points.push({ x: anchorX, y: py, net });
      return text(x + 12, py + 4, `W${String(net + 1).padStart(2, "0")}  Pin ${pin}`, 13) +
        `<circle cx="${anchorX}" cy="${py}" r="4" fill="${colours[net % colours.length]}" stroke="#fff"/>`;
    }).join("");
    return `<rect x="${x}" y="${y}" width="312" height="${blockHeight}" fill="white" stroke="#334155" stroke-width="1.5"/>` +
      text(x + 12, y + 20, `END ${endLetter(index)}`, 13, 700) +
      text(x + 12, y + 43, end.name, 12) +
      line(x, y + 62, x + 312, y + 62) +
      (entries || text(x + 12, y + 86, "No pins assigned", 13, 400, "#64748b"));
  }).join("");

  const wires = design.connections.map((_, net) => {
    const group = points.filter((point) => point.net === net);
    const laneX = 398 + net * 14;
    const colour = colours[net % colours.length];
    const ys = group.map((point) => point.y);
    return `<g stroke="${colour}" stroke-width="2" fill="none">` +
      group.map(({ x, y }) => `<path d="M ${x} ${y} H ${laneX}"/>`).join("") +
      `<path d="M ${laneX} ${Math.min(...ys)} V ${Math.max(...ys)}"/></g>` +
      (group.length > 2 ? group.map(({ y }) => `<circle cx="${laneX}" cy="${y}" r="3" fill="${colour}"/>`).join("") : "");
  }).join("");

  let scheduleRow = scheduleY + 62;
  const schedule = design.connections.map((connection, net) => {
    const y = scheduleRow;
    scheduleRow += 32 + connection.terminals.length * 21;
    const marker = `W${String(net + 1).padStart(2, "0")}`;
    return `<rect x="40" y="${y - 20}" width="${width - 80}" height="${scheduleRow - y + 16}" fill="${net % 2 ? "#f8fafc" : "#fff"}"/>` +
      `<circle cx="55" cy="${y - 5}" r="5" fill="${colours[net % colours.length]}"/>` +
      text(70, y, `${marker}  ${connection.label}`, 14, 700) +
      connection.terminals.map(({ end, pin }, index) =>
        text(94, y + 23 + index * 21, `${endLetter(end)}  ${design.ends[end].name}  /  Pin ${pin}`, 13),
      ).join("");
  }).join("");

  const title = Array.from(name).slice(0, 100).join("");
  const titleLines = Array.from(title.matchAll(/.{1,75}/gu), ([part]) => part);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">` +
    `<title>${escapeXml(name)} wiring drawing</title><rect width="100%" height="100%" fill="#fff"/>` +
    `<rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#64748b"/>` +
    `<g font-family="ui-monospace, monospace">` +
    titleLines.map((part, i) => text(32, 46 + i * 22, part, 20, 700)).join("") +
    header(32, 90, "HARNESS ENDPOINTS") + partRows +
    header(32, segmentsY, "CABLE SEGMENTS / LENGTHS") +
    text(46, segmentsY + 48, "Repeated endpoint letters identify the same connector, bare end or branch point.", 13) + segmentRows +
    header(32, assemblyY, "PIN CONNECTIONS / SCHEMATIC") +
    text(46, assemblyY + 48, "Schematic only — crossing lines are not connected; wire paths do not assign cable cores.", 13) +
    `<rect x="32" y="${diagramY - 12}" width="${width - 64}" height="${assemblyHeight - 80}" fill="#f8fafc" stroke="#cbd5e1"/>` +
    wires + blocks +
    header(32, scheduleY, "WIRE SCHEDULE / PIN MAPPING") +
    schedule +
    text(40, height - 33, "W numbers and colours identify connections only; they do not specify physical wire colours.", 12) +
    "</g></svg>";
}

export const CABLE_WIRING_WIDTH = 1400;
