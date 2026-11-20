"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  connectCableTerminals, endLetter, sameCableTerminal, type CableTerminal, type CableWiring,
} from "@/lib/cable-wiring";

const colours = ["#2563eb", "#b91c1c", "#047857", "#7e22ce", "#b45309", "#0e7490", "#be185d", "#334155"];
const pinKey = (pin: CableTerminal) => JSON.stringify([pin.end, pin.pin.trim().toUpperCase()]);

function layoutPins(design: CableWiring, allPins: CableTerminal[]) {
  const positions: { pin: CableTerminal; x: number; y: number; net: number | undefined }[] = [];
  let rightY = 20;
  const blocks = design.ends.map((connector, index) => {
    const pins = allPins.filter((pin) => pin.end === index);
    const height = 90 + Math.max(pins.length, 1) * 42;
    const x = index === 0 ? 20 : 600;
    const y = index === 0 ? 20 : Math.ceil((rightY - 20) / 42) * 42 + 20 + index * 2;
    if (index !== 0) rightY = y + height + 18;
    pins.forEach((pin, row) => {
      const net = design.connections.findIndex((connection) =>
        connection.terminals.some((terminal) => terminal.pin.trim() && sameCableTerminal(pin, terminal)));
      positions.push({ pin, x: index === 0 ? 200 : 600, y: y + 84 + row * 42, net: net < 0 ? undefined : net });
    });
    return { connector, index, x, y, height, pins };
  });
  return { positions, blocks, height: Math.max(blocks[0].height + 40, rightY + 2, 170) };
}

export function CablePinDiagram({ design, extraPins, onExtraPinsChange, onChange, disabled }: {
  design: CableWiring;
  extraPins: CableTerminal[];
  onExtraPinsChange: (pins: CableTerminal[]) => void;
  onChange: (design: CableWiring) => void;
  disabled: boolean;
}) {
  const [end, setEnd] = useState(0);
  const [labels, setLabels] = useState("");
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dragLine, setDragLine] = useState<{ x: number; y: number; from: string }>();
  const pointer = useRef<{ key: string; x: number; y: number; moved: boolean } | null>(null);

  const allPins: CableTerminal[] = [];
  for (const pin of [...design.connections.flatMap((connection) => connection.terminals), ...extraPins]) {
    if (pin.pin.trim() && pin.end >= 0 && pin.end < design.ends.length &&
      !allPins.some((item) => sameCableTerminal(item, pin))) allPins.push(pin);
  }
  const { positions, blocks, height } = layoutPins(design, allPins);
  const firstPoint = positions.find(({ pin }) => pinKey(pin) === dragLine?.from);

  function addPins() {
    const values = labels.split(",").map((label) => label.trim());
    if (values.some((value) => !value || value.length > 16 || /[\p{Cc}]/u.test(value))) {
      setError("Enter comma-separated pin labels of up to 16 characters, with no empty labels.");
      return;
    }
    const next = values.map((pin) => ({ end, pin }));
    if (next.some((pin, index) => allPins.some((item) => sameCableTerminal(item, pin)) ||
      next.slice(0, index).some((item) => sameCableTerminal(item, pin)))) {
      setError("A pin label already exists on this endpoint. Each pin must be unique.");
      return;
    }
    if (allPins.length + next.length > 320) {
      setError("The diagram can display up to 320 pins at a time.");
      return;
    }
    onExtraPinsChange([...extraPins, ...next]);
    setLabels("");
    setError("");
    setNotice(`${next.length} ${next.length === 1 ? "pin" : "pins"} added to endpoint ${endLetter(end)}.`);
  }

  function connect(first: CableTerminal, second: CableTerminal) {
    const result = connectCableTerminals(design, first, second);
    if ("error" in result) {
      setError(result.error);
      setNotice("");
      return;
    }
    onChange(result.design);
    onExtraPinsChange(extraPins.filter((pin) => !sameCableTerminal(pin, first) && !sameCableTerminal(pin, second)));
    setSelected(undefined);
    setError("");
    setNotice(result.message);
  }

  function choose(pin: CableTerminal) {
    const key = pinKey(pin);
    const first = positions.find((point) => pinKey(point.pin) === selected)?.pin;
    if (!first) {
      setSelected(key);
      setError("");
      setNotice(`Endpoint ${endLetter(pin.end)}, pin ${pin.pin} selected. Choose another pin.`);
    } else if (sameCableTerminal(first, pin)) {
      setSelected(undefined);
      setNotice("Selection cleared.");
    } else {
      connect(first, pin);
    }
  }

  function movePointer(event: PointerEvent<SVGSVGElement>) {
    if (!pointer.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 5) pointer.current.moved = true;
    if (!pointer.current.moved) return;
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    setDragLine({ x: local.x, y: local.y, from: pointer.current.key });
  }

  function releasePointer(event: PointerEvent<SVGSVGElement>) {
    const start = pointer.current;
    if (!start) return;
    pointer.current = null;
    setDragLine(undefined);
    const first = positions.find(({ pin }) => pinKey(pin) === start.key)?.pin;
    if (!first) return;
    if (!start.moved) {
      choose(first);
      return;
    }
    const targetKey = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-pin-key]")?.getAttribute("data-pin-key");
    const target = positions.find(({ pin }) => pinKey(pin) === targetKey)?.pin;
    if (target) connect(first, target);
    else {
      setError("Drop the line on another pin to connect it.");
      setNotice("");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <div>
        <h3 className="font-semibold text-slate-900">Draw connections</h3>
        <p className="mt-1 text-sm text-slate-600">Add pin or wire labels, then drag between them or select two. To make a split, connect an existing pin to another. Positions are schematic and do not assign cable cores.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
        <label className="text-sm">Endpoint
          <select value={end} onChange={(event) => setEnd(Number(event.target.value))}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
            {design.ends.map((connector, index) => <option key={index} value={index}>{endLetter(index)}{connector.name && ` — ${connector.name}`}</option>)}
          </select>
        </label>
        <label className="text-sm">Pin labels
          <input value={labels} onChange={(event) => setLabels(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPins(); } }}
            placeholder="e.g. 1, 2, A3" className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button type="button" onClick={addPins} className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 sm:col-span-2 sm:justify-self-start">Add pins</button>
      </div>
      <p className="text-xs text-slate-600">Only connected pins are saved. Unconnected pins are temporary and can be removed below.</p>
      {extraPins.length > 0 && <div className="flex flex-wrap gap-2">
        {extraPins.map((pin) => <button key={pinKey(pin)} type="button"
          onClick={() => {
            if (!window.confirm(`Remove unused endpoint ${endLetter(pin.end)}, pin ${pin.pin}?`)) return;
            onExtraPinsChange(extraPins.filter((item) => !sameCableTerminal(item, pin)));
            if (selected === pinKey(pin)) setSelected(undefined);
          }}
          className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          aria-label={`Remove unused endpoint ${endLetter(pin.end)} pin ${pin.pin}`}>
          {endLetter(pin.end)}: {pin.pin} ×
        </button>)}
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
      <p className="text-xs text-slate-600">On a narrow screen, scroll the diagram sideways and tap two pins to connect them.</p>
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white" tabIndex={0} aria-label="Scrollable pin diagram">
        <svg viewBox={`0 0 800 ${height}`} className="block h-auto w-full min-w-[550px]"
          role="group" aria-label="Interactive schematic pins" onPointerMove={movePointer} onPointerUp={releasePointer}
          onPointerCancel={() => { pointer.current = null; setDragLine(undefined); }}>
          {design.connections.map((connection, net) => {
            const points = positions.filter((point) => point.net === net);
            if (points.length < 2) return null;
            const lane = 215 + net * 9;
            const colour = colours[net % colours.length];
            return <g key={net} stroke={colour} strokeWidth="2" fill="none" pointerEvents="none">
              {points.map((point) => <path key={pinKey(point.pin)} d={`M ${point.x} ${point.y} H ${lane}`} />)}
              <path d={`M ${lane} ${Math.min(...points.map((point) => point.y))} V ${Math.max(...points.map((point) => point.y))}`} />
              {points.length > 2 && points.map((point) => <circle key={pinKey(point.pin)} cx={lane} cy={point.y} r="3" fill={colour} />)}
            </g>;
          })}
          {firstPoint && dragLine && <line x1={firstPoint.x} y1={firstPoint.y} x2={dragLine.x} y2={dragLine.y} stroke="#2563eb" strokeWidth="3" strokeDasharray="6 4" pointerEvents="none" />}
          {blocks.map(({ connector, index, x, y, height: blockHeight, pins }) => (
            <g key={index}>
              <rect x={x} y={y} width="180" height={blockHeight} rx="8" fill="#f8fafc" stroke="#94a3b8" />
              <text x={x + 12} y={y + 26} fontSize="19" fontWeight="bold" fill="#0f172a">Endpoint {endLetter(index)}</text>
              <text x={x + 12} y={y + 52} fontSize="16" fill="#475569">
                <title>{connector.name || `End ${endLetter(index)}`}</title>{connector.name.length > 18 ? `${connector.name.slice(0, 17)}…` : connector.name || "Name end above"}
              </text>
              {pins.length === 0 && <text x={x + 12} y={y + 90} fontSize="16" fill="#64748b">Add pins above</text>}
            </g>
          ))}
          {positions.map(({ pin, x, y, net }) => {
            const key = pinKey(pin);
            const active = selected === key;
            const name = `Endpoint ${endLetter(pin.end)} pin ${pin.pin}${net === undefined ? ", unconnected" : `, connection ${net + 1}`}`;
            const label = `Pin ${pin.pin}${net === undefined ? "" : ` · W${String(net + 1).padStart(2, "0")}`}`;
            return <g key={key} data-pin-key={key} role="button" tabIndex={disabled ? -1 : 0} aria-label={name}
              aria-pressed={active} aria-disabled={disabled} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              style={{ touchAction: "none" }}
              onKeyDown={(event) => {
                if (!disabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); choose(pin); }
              }}
              onPointerDown={(event) => {
                if (disabled || event.button !== 0) return;
                event.preventDefault();
                pointer.current = { key, x: event.clientX, y: event.clientY, moved: false };
                event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
              }}>
              <rect x={pin.end === 0 ? x - 172 : x + 12} y={y - 19} width="160" height="38" rx="4" fill={active ? "#dbeafe" : "transparent"} />
              <text x={pin.end === 0 ? x - 164 : x + 20} y={y + 6} fontSize="18" fill="#0f172a" pointerEvents="none"
                textLength={label.length > 16 ? 145 : undefined} lengthAdjust="spacingAndGlyphs">
                {label}
              </text>
              <circle cx={x} cy={y} r={active ? 14 : 12} fill={net === undefined ? "#fff" : colours[net % colours.length]}
                stroke={active ? "#1d4ed8" : "#334155"} strokeWidth={active ? 3 : 2} />
            </g>;
          })}
        </svg>
      </div>
      <p className="text-xs text-slate-600">Crossing lines do not connect. W numbers identify connections; colours do not specify physical wire colours.</p>
    </div>
  );
}
