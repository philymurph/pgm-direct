-- One-time additive update for a database that already has Cable Making.
BEGIN;

CREATE TABLE "CableTransfer" (
    "id" TEXT NOT NULL,
    "cableName" TEXT NOT NULL,
    "fromLocation" "CableWorkLocation" NOT NULL,
    "toLocation" "CableWorkLocation" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CableTransfer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CableTransfer_valid_values" CHECK ("quantity" > 0 AND "fromLocation" <> "toLocation")
);

CREATE INDEX "CableTransfer_createdAt_id_idx" ON "CableTransfer"("createdAt", "id");
CREATE INDEX "CableTransfer_cableName_idx" ON "CableTransfer"("cableName");

COMMIT;
