import { z } from "zod";
import { toDecimal, type Money } from "./money";

function positiveInt(max: number) {
  return z.string().regex(/^[1-9]\d*$/, "Enter a positive whole number")
    .transform(Number).pipe(z.number().int().max(max));
}

function positiveEuro(maxWholeDigits: number) {
  return z.string().trim()
    .regex(new RegExp(`^\\d{1,${maxWholeDigits}}(?:[.]\\d{1,2})?$`), "Enter a euro amount with up to two decimal places")
    .transform(toDecimal)
    .refine((value) => value.gt(0), "Enter an amount greater than zero");
}

const ledgerDate = z.iso.date().refine((date) => date >= "0001-01-01", "Enter a valid date")
  .transform((date) => new Date(`${date}T00:00:00Z`));

export const cableTypeSchema = z.object({
  name: z.string().trim().min(1, "Enter a cable name").max(100),
  pinsPerCable: positiveInt(10_000),
  ratePerPin: positiveEuro(4),
});

export const cableWorkEditSchema = z.object({
  completedOn: ledgerDate,
  quantity: positiveInt(100_000),
  location: z.enum(["LOUISE", "PGM"], { error: "Choose Louise or PGM." }),
});

export const cableWorkSchema = cableWorkEditSchema.extend({ cableTypeId: z.cuid() });

export const cableTransferSchema = z.object({
  cableName: z.string().min(1).max(100),
  fromLocation: z.enum(["LOUISE", "PGM"], { error: "Choose a sending location." }),
  toLocation: z.enum(["LOUISE", "PGM"], { error: "Choose a receiving location." }),
  quantity: positiveInt(100_000),
}).refine((value) => value.fromLocation !== value.toLocation, {
  path: ["toLocation"], message: "Choose a different receiving location.",
});

export const cablePaymentSchema = z.object({
  paidOn: ledgerDate,
  amount: positiveEuro(10),
  reference: z.string().trim().max(250).transform((value) => value || null),
});

export function snapshotCableWork(
  cable: { name: string; pinsPerCable: number; ratePerPin: Money },
  quantity: number,
) {
  const ratePerPin = toDecimal(cable.ratePerPin);
  return {
    cableName: cable.name,
    quantity,
    pinsPerCable: cable.pinsPerCable,
    ratePerPin,
    ...cableWorkTotals(cable, quantity),
  };
}

export function cableWorkTotals(
  batch: { pinsPerCable: number; ratePerPin: Money },
  quantity: number,
) {
  const totalPins = quantity * batch.pinsPerCable;
  return {
    totalPins: BigInt(totalPins),
    earned: toDecimal(batch.ratePerPin).times(totalPins),
  };
}

export function cableBalance(earned: Money, paid: Money) {
  return toDecimal(earned).minus(paid);
}
