import assert from "node:assert/strict";
import test from "node:test";
import { cableWiringSchema, harnessWiringSchema, simpleHarnessSchema, simpleHarnessSvg, cableWiringSvg, connectorPinTerminations, connectCableTerminals } from "../src/lib/cable-wiring";
import { fullHarnessSchema } from "../src/lib/full-harness";
import { fullHarnessImageTargets, fullHarnessSvg, fullHarnessSvgHeight } from "../src/lib/full-harness-svg";

const advancedWiringSchema = cableWiringSchema.pipe(harnessWiringSchema);

const split = {
  cableSpec: "4-core & shield",
  ends: [
    { name: "Main <plug>", lengthMm: 300 },
    { name: "Branch one", lengthMm: 100 },
    { name: "Branch two", lengthMm: 150 },
  ],
  connections: [{ label: "Blue", terminals: [{ end: 0, pin: "1" }, { end: 1, pin: "A" }, { end: 2, pin: "2" }] }],
};

const simple = {
  version: 3,
  ends: [{ type: "CONNECTOR", name: "Plug A", pinCount: 4, partNumber: "PL-4" }, { type: "BARE", name: "Bare wires" }],
  segments: [{ cableSpec: "4-core cable", partNumber: "CA-4", from: 0, to: 1, lengthMm: 500 }],
  cores: [
    { core: "Blue", pin: "1", printedLabel: "Signal <A>", spare: false },
    { core: "Red", pin: "2", printedLabel: "Power", spare: false },
    { core: "Black", pin: "3", printedLabel: "Return", spare: false },
    { core: "White", pin: "4", printedLabel: "Spare signal", spare: false },
  ],
};

const branched = {
  version: 4,
  ends: [
    { type: "CONNECTOR", name: "Plug A", partId: "clh0000000000000000000001", pinCount: 2 },
    { type: "SPLICE", name: "Branch" },
    { type: "CONNECTOR", name: "Plug B", partId: "clh0000000000000000000002", pinCount: 2 },
    { type: "BARE", name: "Bare end" },
  ],
  segments: [
    { cableSpec: "Two core", stockPartId: "clh0000000000000000000003", from: 0, to: 1, lengthMm: 500,
      cores: [{ colour: "#1761c9", stripeColour: "#ffffff", spare: false, from: "1", to: "signal" },
        { colour: "#d00000", spare: true, from: "", to: "" }] },
    { cableSpec: "Single core", stockPartId: "clh0000000000000000000004", from: 1, to: 2, lengthMm: 200,
      cores: [{ spare: false, from: "Signal", to: "2" }] },
    { cableSpec: "Single core", stockPartId: "clh0000000000000000000004", from: 1, to: 3, lengthMm: 150,
      cores: [{ spare: false, from: "signal", to: "Label A" }] },
  ],
};

test("full harness validates multi-cable splice groups and counts connector terminations", () => {
  assert.equal(fullHarnessSchema.safeParse({ version: 4, ends: [], segments: [] }).success, false);
  const design = fullHarnessSchema.parse(branched);
  assert.deepEqual(cableWiringSchema.parse(design), design);
  assert.equal(connectorPinTerminations(design), 2);
  assert.equal(fullHarnessSchema.safeParse({ ...branched, segments: [branched.segments[0]] }).success, false);
  assert.equal(fullHarnessSchema.safeParse({ ...branched, segments: [
    { ...branched.segments[0], cores: [{ ...branched.segments[0].cores[0], to: "isolated" }] }, ...branched.segments.slice(1),
  ] }).success, false);
  assert.equal(fullHarnessSchema.safeParse({ ...branched, segments: [
    { ...branched.segments[0], cores: [{ ...branched.segments[0].cores[0], from: "3" }] }, ...branched.segments.slice(1),
  ] }).success, false);
  assert.equal(fullHarnessSchema.safeParse({ ...branched, segments: [
    { ...branched.segments[0], cores: [branched.segments[0].cores[0], { ...branched.segments[0].cores[0] }] }, ...branched.segments.slice(1),
  ] }).success, false);
  assert.equal(fullHarnessSchema.safeParse({ ...branched, segments: [
    { ...branched.segments[0], cores: [{ ...branched.segments[0].cores[0], spare: true }] }, ...branched.segments.slice(1),
  ] }).success, false);
});

test("full harness drawing shows connectors, coloured wires, spares and splice and bare-end labels", () => {
  const design = fullHarnessSchema.parse(branched);
  const svg = fullHarnessSvg("Harness <test>", design);
  assert.match(svg, /Harness &lt;test&gt;/);
  assert.match(svg, /aria-label="Connector housing"/);
  assert.match(svg, /Pin 1/);
  assert.match(svg, /Pin 2/);
  assert.match(svg, /Group signal/);
  assert.match(svg, /Label: Label A/);
  assert.match(svg, /stroke="#1761c9" stroke-width="8"/);
  assert.match(svg, /stroke="#ffffff" stroke-width="8" stroke-dasharray="12 16"/);
  assert.match(svg, /Spare - not connected/);
  assert.match(svg, /x1="312"[^>]+x2="888"[^>]+stroke-dasharray="14 8"/);
  assert.match(svg, new RegExp(`viewBox="0 0 1200 ${fullHarnessSvgHeight(design)}"`));
});

test("image markers are placed on their cable and connector, not on bare or splice ends", () => {
  const design = fullHarnessSchema.parse({
    ...branched,
    ends: [{ ...branched.ends[0], imageId: "clh0000000000000000000005" }, ...branched.ends.slice(1)],
    segments: [{ ...branched.segments[0], imageId: "clh0000000000000000000006" }, ...branched.segments.slice(1)],
  });
  const targets = fullHarnessImageTargets(design);
  assert.deepEqual(targets.map(({ label }) => label), ["Cable 1: Two core", "End 1: Plug A"]);
  for (const target of targets) {
    assert.ok(target.x >= 0 && target.x + target.width <= 1200);
    assert.ok(target.y >= 0 && target.y + target.height <= fullHarnessSvgHeight(design));
  }
});

test("simple build sheet preserves pin-to-core mappings and printed bare-end labels", () => {
  const design = simpleHarnessSchema.parse(simple);
  assert.deepEqual(cableWiringSchema.parse(design), design);
  assert.equal(connectorPinTerminations(design), 4);
  const svg = simpleHarnessSvg("Test & harness", design);
  assert.match(svg, /Test &amp; harness/);
  assert.match(svg, /4 pin positions/);
  assert.match(svg, /Cut length: 500 mm/);
  assert.match(svg, /PL-4/);
  assert.match(svg, /CA-4/);
  assert.match(svg, /PRINT THIS LABEL/);
  assert.match(svg, /Pin 1/);
  assert.match(svg, /Blue/);
  assert.match(svg, /Signal &lt;A&gt;/);
  assert.match(svg, /Spare signal/);
});

test("simple build sheet validates core identity, connector pins, printed labels and spares", () => {
  const spare = { ...simple, cores: [...simple.cores.slice(0, 3), { core: "White", pin: "", printedLabel: "", spare: true }] };
  const parsed = simpleHarnessSchema.parse(spare);
  assert.equal(connectorPinTerminations(parsed), 3);
  assert.match(simpleHarnessSvg("Spare", parsed), /Not connected \/ no label/);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, cores: [...simple.cores.slice(0, 3), { ...simple.cores[3], core: "blue" }] }).success, false);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, cores: [...simple.cores.slice(0, 3), { ...simple.cores[3], pin: "1" }] }).success, false);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, cores: [{ ...simple.cores[0], printedLabel: "" }] }).success, false);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, cores: [{ ...simple.cores[0], spare: true }] }).success, false);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, cores: [{ core: "Blue", spare: true, pin: "", printedLabel: "" }] }).success, false);
  assert.equal(simpleHarnessSchema.safeParse({ ...simple, ends: [{ ...simple.ends[0], pinCount: 3 }, simple.ends[1]] }).success, false);
});

test("selected core and stripe colours appear on the drawing without guessing older colours", () => {
  const design = simpleHarnessSchema.parse({
    ...simple,
    cores: [
      { ...simple.cores[0], colour: "#1761C9", stripeColour: "#ffffff" },
      { ...simple.cores[1], colour: "#123456" },
      { ...simple.cores[2], colour: "#ffffff" },
      { ...simple.cores[3], spare: true, pin: "", printedLabel: "", colour: "#008641", stripeColour: "#f4d400" },
    ],
  });
  assert.equal(design.cores[0].colour, "#1761c9");
  assert.deepEqual(cableWiringSchema.parse(design), design);
  const svg = simpleHarnessSvg("Colours", design);
  assert.match(svg, /stroke="#1761c9" stroke-width="6"/);
  assert.match(svg, /stroke="#ffffff" stroke-width="6" stroke-dasharray="14 14"/);
  assert.match(svg, /Blue \/ White stripe/);
  assert.match(svg, /stroke="#123456" stroke-width="6"/);
  assert.match(svg, /Custom #123456/);
  assert.match(svg, /Green \/ Yellow stripe/);
  const old = simpleHarnessSchema.parse(simple);
  assert.match(simpleHarnessSvg("Old", old), /Colour not specified/);
  assert.doesNotMatch(simpleHarnessSvg("Old", old), /stroke="#1761c9"/);
});

test("invalid or ambiguous stripe colours are rejected", () => {
  const withCore = (change: object) => ({ ...simple, cores: [{ ...simple.cores[0], ...change }, ...simple.cores.slice(1)] });
  assert.equal(simpleHarnessSchema.safeParse(withCore({ colour: "#bad" })).success, false);
  assert.equal(simpleHarnessSchema.safeParse(withCore({ colour: '#123456" onload="bad' })).success, false);
  assert.equal(simpleHarnessSchema.safeParse(withCore({ stripeColour: "#ffffff" })).success, false);
  assert.equal(simpleHarnessSchema.safeParse(withCore({ colour: "#ffffff", stripeColour: "#FFFFFF" })).success, false);
});

test("the largest simple build sheet includes every core and keeps long labels within the page", () => {
  const longLabel = "L".repeat(40);
  const design = simpleHarnessSchema.parse({
    ...simple,
    ends: [{ ...simple.ends[0], pinCount: 40 }, simple.ends[1]],
    cores: Array.from({ length: 40 }, (_, index) => ({
      core: `Core ${index + 1}`, pin: String(index + 1), printedLabel: index === 39 ? longLabel : `Label ${index + 1}`, spare: false,
    })),
  });
  const svg = simpleHarnessSvg("Maximum", design);
  const height = Number(svg.match(/viewBox="0 0 1400 (\d+)"/)?.[1]);
  const lastLabel = svg.match(/<text x="1070" y="(\d+)"[^>]*textLength="(\d+)"[^>]*>L{40}<\/text>/);
  assert.ok(lastLabel);
  assert.ok(Number(lastLabel[1]) < height - 33);
  assert.ok(1070 + Number(lastLabel[2]) < 1368);
  assert.match(svg, /Pin 40/);
});

test("the split wiring drawing includes each named end, leg length and connected pin", () => {
  const design = advancedWiringSchema.parse(split);
  const svg = cableWiringSvg("Cable <test>", design);
  assert.match(svg, /Cable &lt;test&gt;/);
  assert.match(svg, /4-core &amp; shield/);
  assert.deepEqual(design.segments.map(({ from, to, lengthMm }) => [from, to, lengthMm]), [[0, 3, 300], [1, 3, 100], [2, 3, 150]]);
  assert.match(svg, /300 mm/);
  assert.match(svg, /100 mm/);
  assert.match(svg, /150 mm/);
  assert.match(svg, /A  Main &lt;plug&gt;  \/  Pin 1/);
  assert.match(svg, /B  Branch one  \/  Pin A/);
  assert.match(svg, /C  Branch two  \/  Pin 2/);
});

test("rejects duplicated terminal assignments, non-existent ends, and missing leg lengths", () => {
  assert.equal(cableWiringSchema.safeParse({
    ...split, connections: [...split.connections, { label: "Other", terminals: [{ end: 1, pin: "a" }, { end: 2, pin: "3" }] }],
  }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...split, ends: split.ends.slice(0, 2) }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...split, ends: [...split.ends.slice(0, 2), { name: "Branch two", lengthMm: 0 }] }).success, false);
});

test("a two-ended cable prints one overall length", () => {
  const design = advancedWiringSchema.parse({
    ...split,
    ends: [split.ends[0], { ...split.ends[1], lengthMm: 0 }],
    connections: [{ ...split.connections[0], terminals: split.connections[0].terminals.slice(0, 2) }],
  });

  const svg = cableWiringSvg("Two ends", design);
  assert.equal(design.segments.length, 1);
  assert.match(svg, /300 mm/);
  assert.match(svg, />A  Main &lt;plug&gt;<\/text>/);
  assert.match(svg, />B  Branch one<\/text>/);
});

test("saved library part selections remain usable without images", () => {
  const connector = "cmtt6530g004qa96boipt9abc";
  const stock = "cmtt6530g004qa96boipt9abd";
  const design = advancedWiringSchema.parse({
    ...split, stockPartId: stock,
    ends: [{ ...split.ends[0], partId: connector }, ...split.ends.slice(1)],
  });
  const svg = cableWiringSvg("Parts", design);
  assert.equal(design.segments[0].stockPartId, stock);
  assert.equal(design.ends[0].partId, connector);
  assert.match(svg, /Main &lt;plug&gt;/);
  assert.match(svg, /4-core &amp; shield/);
  assert.doesNotMatch(svg, /<image\b/);
});

test("the assembly view shows every mapped pin and identifies diagram colours", () => {
  const design = advancedWiringSchema.parse({
    ...split,
    connections: [
      split.connections[0],
      { label: "Return", terminals: [{ end: 0, pin: "2" }, { end: 2, pin: "4" }] },
    ],
  });
  const svg = cableWiringSvg("Assembly", design);
  assert.match(svg, /HARNESS ENDPOINTS/);
  assert.match(svg, /CABLE SEGMENTS \/ LENGTHS/);
  assert.match(svg, /PIN CONNECTIONS \/ SCHEMATIC/);
  assert.match(svg, /WIRE SCHEDULE \/ PIN MAPPING/);
  assert.equal((svg.match(/W01  Pin /g) ?? []).length, 3);
  assert.equal((svg.match(/W02  Pin /g) ?? []).length, 2);
  assert.match(svg, /crossing lines are not connected/);
  assert.match(svg, /do not specify physical wire colours/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});

test("the largest supported branched diagram includes every mapped terminal", () => {
  const design = advancedWiringSchema.parse({
    cableSpec: "Multi-core",
    ends: Array.from({ length: 8 }, (_, end) => ({ name: `End ${end + 1}`, lengthMm: 100 })),
    connections: Array.from({ length: 40 }, (_, net) => ({
      label: `Wire ${net + 1}`,
      terminals: Array.from({ length: 8 }, (_, end) => ({ end, pin: String(net + 1) })),
    })),
  });
  const svg = cableWiringSvg("Maximum", design);
  assert.equal((svg.match(/W\d\d  Pin /g) ?? []).length, 320);
  assert.equal((svg.match(/\/  Pin /g) ?? []).length, 320);
  assert.match(svg, /W40  Pin 40/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
  const height = Number(svg.match(/viewBox="0 0 1400 (\d+)"/)?.[1]);
  const finalTerminalY = Number(svg.match(/y="(\d+)"[^>]*>H  End 8  \/  Pin 40<\/text>/)?.[1]);
  assert.ok(finalTerminalY > 0 && finalTerminalY < height - 33);
  const blocks = [...svg.matchAll(/<rect x="1032" y="(\d+)" width="312" height="(\d+)"/g)];
  assert.equal(blocks.length, 8);
  for (let i = 1; i < blocks.length; i++) {
    assert.ok(Number(blocks[i][1]) >= Number(blocks[i - 1][1]) + Number(blocks[i - 1][2]));
  }
});

test("drawing a connection replaces only the untouched blank row and supports branching", () => {
  const design = {
    ...advancedWiringSchema.parse(split),
    connections: [{ label: "Wire 1", terminals: [{ end: 0, pin: "" }, { end: 1, pin: "" }] }],
  };
  const first = connectCableTerminals(design, { end: 0, pin: "1" }, { end: 1, pin: "2" });
  assert.ok("design" in first);
  assert.deepEqual(first.design.connections, [{ label: "Wire 1", terminals: [{ end: 0, pin: "1" }, { end: 1, pin: "2" }] }]);
  const branch = connectCableTerminals(first.design, { end: 1, pin: "2" }, { end: 2, pin: "3" });
  assert.ok("design" in branch);
  assert.deepEqual(branch.design.connections[0].terminals, [{ end: 0, pin: "1" }, { end: 1, pin: "2" }, { end: 2, pin: "3" }]);
  assert.equal(design.connections[0].terminals[0].pin, "");
});

test("drawing cannot join different connections or reuse the same pin", () => {
  const design = advancedWiringSchema.parse({
    ...split,
    connections: [split.connections[0], { label: "Return", terminals: [{ end: 0, pin: "2" }, { end: 1, pin: "3" }] }],
  });
  assert.ok("error" in connectCableTerminals(design, { end: 0, pin: "1" }, { end: 1, pin: "3" }));
  assert.ok("error" in connectCableTerminals(design, { end: 1, pin: "a" }, { end: 1, pin: "A" }));
  assert.ok("error" in connectCableTerminals(design, { end: 0, pin: "1" }, { end: 2, pin: "2" }));
});

test("drawing preserves partially entered rows and enforces connection limits", () => {
  const harness = advancedWiringSchema.parse(split);
  const partial = { ...harness, connections: [{ label: "Custom", terminals: [{ end: 0, pin: "" }, { end: 1, pin: "" }] }] };
  const added = connectCableTerminals(partial, { end: 0, pin: "1" }, { end: 1, pin: "2" });
  assert.ok("design" in added);
  assert.equal(added.design.connections.length, 2);
  assert.equal(added.design.connections[0].label, "Custom");
  const changedEnd = { ...partial, connections: [{ label: "Wire 1", terminals: [{ end: 2, pin: "" }, { end: 1, pin: "" }] }] };
  const kept = connectCableTerminals(changedEnd, { end: 0, pin: "1" }, { end: 1, pin: "2" });
  assert.ok("design" in kept);
  assert.equal(kept.design.connections[0].terminals[0].end, 2);
  assert.equal(kept.design.connections.length, 2);
  const full = { ...harness, connections: [{ label: "Full", terminals: Array.from({ length: 8 }, (_, i) => ({ end: 0, pin: String(i) })) }] };
  assert.ok("error" in connectCableTerminals(full, { end: 0, pin: "0" }, { end: 1, pin: "new" }));
  const forty = { ...harness, connections: Array.from({ length: 40 }, (_, i) => ({
    label: `Wire ${i}`, terminals: [{ end: 0, pin: String(i) }, { end: 1, pin: String(i) }],
  })) };
  assert.ok("error" in connectCableTerminals(forty, { end: 0, pin: "new" }, { end: 1, pin: "new" }));
});

test("a harness supports bare wires, splice points and different cable segments", () => {
  const design = advancedWiringSchema.parse({
    version: 2,
    ends: [
      { type: "CONNECTOR", name: "Plug" },
      { type: "SPLICE", name: "Branch" },
      { type: "BARE", name: "Loose wires" },
    ],
    segments: [
      { cableSpec: "4-core", from: 0, to: 1, lengthMm: 500 },
      { cableSpec: "2-core", from: 1, to: 2, lengthMm: 250 },
    ],
    connections: [{ label: "Signal", terminals: [{ end: 0, pin: "1" }, { end: 2, pin: "red" }] }],
  });
  const svg = cableWiringSvg("Harness", design);
  assert.match(svg, /4-core/);
  assert.match(svg, /2-core/);
  assert.match(svg, />A  Plug<\/text>/);
  assert.equal((svg.match(/>B  Branch<\/text>/g) ?? []).length, 2);
  assert.match(svg, />C  Loose wires<\/text>/);
  assert.match(svg, /Bare wires/);
  assert.match(svg, /Branch \/ splice/);
  assert.equal(connectorPinTerminations(design), 1);
});

test("pin terminations count each mapped connector pin, not wire ends or splices", () => {
  const design = advancedWiringSchema.parse({
    version: 2,
    ends: [
      { type: "CONNECTOR", name: "Plug A" }, { type: "CONNECTOR", name: "Plug B" },
      { type: "BARE", name: "Loose wires" }, { type: "SPLICE", name: "Branch" },
    ],
    segments: [
      { cableSpec: "Main", from: 0, to: 3, lengthMm: 100 },
      { cableSpec: "Branch", from: 3, to: 1, lengthMm: 100 },
      { cableSpec: "Branch", from: 3, to: 2, lengthMm: 100 },
    ],
    connections: Array.from({ length: 4 }, (_, i) => ({
      label: `Wire ${i + 1}`,
      terminals: [{ end: 0, pin: String(i + 1) }, { end: 1, pin: String(i + 1) },
        { end: 2, pin: String(i + 1) }, { end: 3, pin: String(i + 1) }],
    })),
  });
  assert.equal(connectorPinTerminations(design), 8);
});

test("harness validation rejects missing connectors, bad endpoints and disconnected segments", () => {
  const valid = {
    version: 2,
    ends: [{ type: "CONNECTOR", name: "Plug" }, { type: "BARE", name: "Wires" }],
    segments: [{ cableSpec: "Cable", from: 0, to: 1, lengthMm: 100 }],
    connections: [{ label: "Signal", terminals: [{ end: 0, pin: "1" }, { end: 1, pin: "red" }] }],
  };
  assert.equal(cableWiringSchema.safeParse(valid).success, true);
  assert.equal(cableWiringSchema.safeParse({ ...valid, ends: valid.ends.map((end) => ({ ...end, type: "BARE" })) }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [{ ...valid.segments[0], to: 0 }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [{ ...valid.segments[0], to: -1 }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [{ ...valid.segments[0], to: 0.5 }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [{ ...valid.segments[0], to: 2 }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, segments: [{ ...valid.segments[0], lengthMm: 0 }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({ ...valid, ends: [...valid.ends, { type: "SPLICE", name: "Unconnected" }] }).success, false);
  assert.equal(cableWiringSchema.safeParse({
    ...valid,
    ends: [...valid.ends, { type: "BARE", name: "Third" }, { type: "BARE", name: "Fourth" }],
    segments: [...valid.segments, { cableSpec: "Other", from: 2, to: 3, lengthMm: 10 }],
  }).success, false);
  assert.equal(cableWiringSchema.safeParse({
    ...valid, ends: [valid.ends[0], { ...valid.ends[1], partId: "cmtt6530g004qa96boipt9abc" }],
  }).success, false);
});

test("the largest harness drawing includes all segments and fits its schedule", () => {
  const design = advancedWiringSchema.parse({
    version: 2,
    ends: Array.from({ length: 16 }, (_, index) => ({
      type: index === 0 ? "CONNECTOR" : "BARE", name: `Endpoint ${index + 1}`,
    })),
    segments: Array.from({ length: 32 }, (_, index) => ({
      cableSpec: `Cable ${index + 1}`, from: index % 16, to: (index + 1) % 16, lengthMm: index + 1,
    })),
    connections: Array.from({ length: 40 }, (_, index) => ({
      label: `Wire ${index + 1}`,
      terminals: Array.from({ length: 8 }, (_, end) => ({ end, pin: String(index + 1) })),
    })),
  });
  const svg = cableWiringSvg("Maximum harness", design);
  const height = Number(svg.match(/viewBox="0 0 1400 (\d+)"/)?.[1]);
  const lastPin = Number(svg.match(/y="(\d+)"[^>]*>H  Endpoint 8  \/  Pin 40<\/text>/)?.[1]);
  assert.equal((svg.match(/>C\d\d<\/text>/g) ?? []).length, 32);
  assert.match(svg, />C32<\/text>/);
  assert.match(svg, />P  Endpoint 16<\/text>/);
  assert.ok(lastPin > 0 && lastPin < height - 33);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});
