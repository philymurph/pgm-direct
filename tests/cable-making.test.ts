import assert from "node:assert/strict";
import test from "node:test";
import { cableAttachmentDownloadName, readCableAttachment } from "../src/lib/cable-attachments";
import { summarizeCableWorkByLocation } from "../src/lib/cable-work-location";
import {
  cableBalance,
  cablePaymentSchema,
  cableTransferSchema,
  cableTypeSchema,
  cableWorkEditSchema,
  cableWorkSchema,
  cableWorkTotals,
  snapshotCableWork,
} from "../src/lib/cable-making";

test("completed work keeps the original cable details and exact earnings", () => {
  const cable = { name: "Cable A", pinsPerCable: 12, ratePerPin: "1.03" };
  const entry = snapshotCableWork(cable, 10);
  cable.name = "Cable B";
  cable.pinsPerCable = 8;
  cable.ratePerPin = "2.00";

  assert.equal(entry.cableName, "Cable A");
  assert.equal(entry.pinsPerCable, 12);
  assert.equal(entry.totalPins, BigInt(120));
  assert.equal(entry.ratePerPin.toFixed(2), "1.03");
  assert.equal(entry.earned.toFixed(2), "123.60");
  assert.equal(snapshotCableWork(cable, 10).earned.toFixed(2), "160.00");
});

test("balances keep fractional cents exact to two decimals and show overpayments", () => {
  assert.equal(cableBalance("123.60", "50.05").toFixed(2), "73.55");
  assert.equal(cableBalance("120.00", "125.01").toFixed(2), "-5.01");
});

test("editing a batch recalculates totals without accepting a new cable type or rate", () => {
  const parsed = cableWorkEditSchema.parse({
    completedOn: "2026-11-18",
    quantity: "3",
    location: "PGM",
    cableTypeId: "another-cable",
    ratePerPin: "9.99",
  });
  assert.deepEqual(Object.keys(parsed), ["completedOn", "quantity", "location"]);
  const batch = snapshotCableWork({ name: "Original", pinsPerCable: 12, ratePerPin: "1.03" }, 10);
  const updated = cableWorkTotals(batch, parsed.quantity);
  assert.equal(updated.totalPins, BigInt(36));
  assert.equal(updated.earned.toFixed(2), "37.08");
});

test("ledger inputs reject invalid calendar dates, quantities and money", () => {
  const work = { cableTypeId: "cmtt6530g004qa96boipt9abc", completedOn: "2028-02-29", quantity: "10", location: "LOUISE" };
  assert.equal(cableWorkSchema.parse(work).completedOn.toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(cableWorkSchema.safeParse({ ...work, completedOn: "2027-02-29" }).success, false);
  assert.equal(cableWorkSchema.safeParse({ ...work, quantity: "1.5" }).success, false);
  assert.equal(cableTypeSchema.safeParse({ name: "Cable A", pinsPerCable: "0", ratePerPin: "1" }).success, false);
  for (const amount of ["0", "-1", "1.001", "1e2"]) {
    assert.equal(cablePaymentSchema.safeParse({ paidOn: "2026-11-18", amount, reference: "" }).success, false);
  }
});

test("new and edited batches require a supported location", () => {
  const entry = { completedOn: "2026-11-18", quantity: "1" };
  const batch = { ...entry, cableTypeId: "cmtt6530g004qa96boipt9abc" };
  assert.equal(cableWorkSchema.safeParse(batch).success, false);
  assert.equal(cableWorkEditSchema.safeParse({ ...entry, location: "OTHER" }).success, false);
  assert.equal(cableWorkSchema.parse({ ...batch, location: "LOUISE" }).location, "LOUISE");
  assert.equal(cableWorkEditSchema.parse({ ...entry, location: "PGM" }).location, "PGM");
});

test("location summary totals recorded batches by historical cable name and includes unset locations", () => {
  const summary = summarizeCableWorkByLocation([
    { location: "PGM", cableName: "Cable B", quantity: 3 },
    { location: "LOUISE", cableName: "Cable A", quantity: 4 },
    { location: "PGM", cableName: "Cable A", quantity: 2 },
    { location: "PGM", cableName: "Cable A", quantity: 5 },
    { location: null, cableName: "Deleted cable", quantity: 1 },
  ]);
  assert.deepEqual(summary.map(({ label, total, cables }) => ({ label, total, cables })), [
    { label: "Louise", total: 4, cables: [{ name: "Cable A", quantity: 4 }] },
    { label: "PGM", total: 10, cables: [{ name: "Cable A", quantity: 7 }, { name: "Cable B", quantity: 3 }] },
    { label: "Not set", total: 1, cables: [{ name: "Deleted cable", quantity: 1 }] },
  ]);
  assert.deepEqual(summarizeCableWorkByLocation([]).map(({ label, total }) => ({ label, total })), [
    { label: "Louise", total: 0 }, { label: "PGM", total: 0 },
  ]);
});

test("transfers adjust location totals without changing unset work", () => {
  const summary = summarizeCableWorkByLocation([
    { location: "LOUISE", cableName: "Cable A", quantity: 8 },
    { location: null, cableName: "Cable A", quantity: 2 },
  ], [
    { cableName: "Cable A", fromLocation: "LOUISE", toLocation: "PGM", quantity: 5 },
    { cableName: "Cable A", fromLocation: "PGM", toLocation: "LOUISE", quantity: 1 },
  ]);
  assert.deepEqual(summary.map(({ label, total }) => ({ label, total })), [
    { label: "Louise", total: 4 }, { label: "PGM", total: 4 }, { label: "Not set", total: 2 },
  ]);
});

test("transfer inputs require different supported locations and a positive whole quantity", () => {
  const input = { cableName: "Cable A", fromLocation: "LOUISE", toLocation: "PGM", quantity: "3" };
  assert.equal(cableTransferSchema.parse(input).quantity, 3);
  for (const invalid of [
    { ...input, toLocation: "LOUISE" },
    { ...input, fromLocation: "OTHER" },
    { ...input, quantity: "1.5" },
    { ...input, quantity: "0" },
  ]) assert.equal(cableTransferSchema.safeParse(invalid).success, false);
});

test("cable attachments require the right file signature and fit the upload limits", async () => {
  assert.equal(await readCableAttachment("IMAGE", ""), null);
  assert.equal(await readCableAttachment("IMAGE", new File([], "")), null);
  const pdf = new File(["%PDF-1.7\n"], "drawing.pdf", { type: "application/pdf" });
  assert.equal((await readCableAttachment("PDF", pdf))?.file?.contentType, "application/pdf");
  assert.ok((await readCableAttachment("IMAGE", pdf))?.error);
  const spoofed = new File(["<html>"], "drawing.pdf", { type: "application/pdf" });
  assert.ok((await readCableAttachment("PDF", spoofed))?.error);
  const limit = 2 * 1024 * 1024;
  for (const size of [limit, limit + 1]) {
    const bytes = new Uint8Array(size);
    bytes.set(new TextEncoder().encode("%PDF-1.7"));
    const result = await readCableAttachment("PDF", new File([bytes], "drawing.pdf", { type: "application/pdf" }));
    assert.equal(result?.file?.data.length, size === limit ? limit : undefined);
  }
});

test("blank browser uploads are optional, but selected empty files are rejected", async () => {
  const blank = new File([], "blob", { type: "application/octet-stream" });
  assert.equal(await readCableAttachment("IMAGE", blank), null);
  assert.equal(await readCableAttachment("PDF", blank), null);
  assert.ok((await readCableAttachment("IMAGE", new File([], "photo.png", { type: "image/png" })))?.error);
  assert.ok((await readCableAttachment("PDF", new File([], "drawing.pdf", { type: "application/pdf" })))?.error);
});

test("download names cannot inject response headers", () => {
  assert.equal(cableAttachmentDownloadName('drawing"\r\n.pdf', "application/pdf"), "drawing___.pdf");
});
