import { escapeXml } from "./cable-wiring";
import { coreColourDescription } from "./core-colours";
import type { FullHarness } from "./full-harness";

const width = 1200;
const rowHeight = 66;
const segmentHeight = (segment: FullHarness["segments"][number]) => 190 + segment.cores.length * rowHeight;

export function fullHarnessImageTargets(design: FullHarness) {
  let top = 70;
  return design.segments.flatMap((segment, index) => {
    const bodyTop = top + 114;
    const bodyHeight = segment.cores.length * rowHeight + 44;
    const targets = [
      ...(segment.imageId ? [{ partId: segment.stockPartId, imageId: segment.imageId, label: `Cable ${index + 1}: ${segment.cableSpec}`, x: 40, y: top + 3, width: 1120, height: 37 }] : []),
      ...([["from", true], ["to", false]] as const).flatMap(([side, left]) => {
        const endIndex = segment[side];
        const end = design.ends[endIndex];
        return end.type === "CONNECTOR" && end.imageId
          ? [{ partId: end.partId, imageId: end.imageId, label: `End ${endIndex + 1}: ${end.name}`, x: left ? 42 : 918, y: bodyTop, width: 240, height: bodyHeight }]
          : [];
      }),
    ];
    top += segmentHeight(segment);
    return targets;
  });
}

export function fullHarnessSvgHeight(design: FullHarness) {
  return 86 + design.segments.reduce((height, segment) => height + segmentHeight(segment), 0);
}

export function fullHarnessSvg(name: string, design: FullHarness) {
  const text = (x: number, y: number, value: string, size: number, maxWidth: number, weight = 400) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" textLength="${Math.min(maxWidth, Array.from(value).length * size * 0.6)}" lengthAdjust="spacingAndGlyphs">${escapeXml(value)}</text>`;
  const height = fullHarnessSvgHeight(design);
  let top = 70;
  const segments = design.segments.map((segment, index) => {
    const from = design.ends[segment.from];
    const to = design.ends[segment.to];
    const cardHeight = segmentHeight(segment) - 16;
    const bodyTop = top + 114;
    const bodyHeight = segment.cores.length * rowHeight + 44;
    const housing = (end: FullHarness["ends"][number], left: boolean) => {
      if (end.type !== "CONNECTOR") return "";
      const x = left ? 42 : 918;
      return `<g aria-label="Connector housing"><rect x="${x}" y="${bodyTop}" width="240" height="${bodyHeight}" rx="16" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>` +
        `<rect x="${left ? x + 7 : x + 217}" y="${bodyTop + 8}" width="16" height="${bodyHeight - 16}" rx="7" fill="#94a3b8"/>` +
        `</g>`;
    };
    const endpoint = (end: FullHarness["ends"][number], value: string, y: number, left: boolean, spare: boolean) => {
      const x = left ? 282 : 918;
      const labelX = left ? 72 : 958;
      if (spare) return text(labelX, y + 6, "Spare - not connected", 16, 185);
      if (end.type === "CONNECTOR") {
        return `<rect x="${labelX - 8}" y="${y - 19}" width="112" height="38" rx="8" fill="#fff" stroke="#cbd5e1"/>` +
          `<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#1e3a5f" stroke-width="3"/>` +
          text(labelX + 5, y + 6, `Pin ${value}`, 18, 96, 700);
      }
      if (end.type === "SPLICE") {
        return `<path d="M ${x - 11} ${y} l 11 -10 11 10 -11 10 Z" fill="#fef3c7" stroke="#92400e" stroke-width="2"/>` +
          text(left ? 50 : 949, y + 6, `Group ${value}`, 16, 195, 700);
      }
      const copperEnd = left ? x - 25 : x + 25;
      return `<line x1="${x}" y1="${y}" x2="${copperEnd}" y2="${y}" stroke="#b87333" stroke-width="5" stroke-linecap="round"/>` +
        text(left ? 50 : 959, y + 6, `Label: ${value}`, 16, 185, 700);
    };
    const rows = segment.cores.map((core, coreIndex) => {
      const y = bodyTop + 72 + coreIndex * rowHeight;
      const start = core.spare ? 312 : 282;
      const end = core.spare ? 888 : 918;
      const dash = core.spare ? ' stroke-dasharray="14 14"' : "";
      const wire = `<line x1="${start}" y1="${y}" x2="${end}" y2="${y}" stroke="#475569" stroke-width="12" stroke-linecap="round"${dash}/>` +
        (core.colour ? `<line x1="${start}" y1="${y}" x2="${end}" y2="${y}" stroke="${core.colour}" stroke-width="8" stroke-linecap="round"${dash}/>` : "") +
        (core.stripeColour ? `<line x1="${start}" y1="${y}" x2="${end}" y2="${y}" stroke="${core.stripeColour}" stroke-width="8" stroke-dasharray="${core.spare ? "7 21" : "12 16"}"/>` : "");
      return text(335, y - 16, `Core ${coreIndex + 1}: ${coreColourDescription(core.colour, core.stripeColour)}${core.spare ? " (spare)" : ""}`, 18, 530, 600) +
        wire + endpoint(from, core.from, y, true, core.spare) + endpoint(to, core.to, y, false, core.spare);
    }).join("");
    const endHeading = (end: FullHarness["ends"][number], endIndex: number, x: number, maxWidth: number) =>
      text(x, top + 60, `END ${endIndex + 1} · ${end.type === "CONNECTOR" ? "CONNECTOR" : end.type === "SPLICE" ? "SPLICE" : "BARE WIRES"}`, 14, maxWidth, 700) +
      text(x, top + 87, end.name, 19, maxWidth, 700);
    const segmentSvg = `<rect x="16" y="${top}" width="1168" height="${cardHeight}" rx="15" fill="#fff" stroke="#cbd5e1"/>` +
      text(40, top + 30, `Cable ${index + 1}: ${segment.cableSpec}${segment.partNumber ? ` (${segment.partNumber})` : ""} / ${segment.lengthMm} mm`, 20, 1040, 700) +
      endHeading(from, segment.from, 42, 500) + endHeading(to, segment.to, 685, 470) +
      housing(from, true) + housing(to, false) + rows;
    top += segmentHeight(segment);
    return segmentSvg;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">` +
    `<title>${escapeXml(name)} harness drawing</title><desc>Symbolic connector housings, coloured cores and end assignments. Spare cores are not connected.</desc>` +
    `<rect width="100%" height="100%" fill="#f8fafc"/><g fill="#1e293b" font-family="Arial, sans-serif">` +
    text(32, 38, name, 23, 1120, 700) + segments + "</g></svg>";
}
