-- One-time update for an existing database without Cable Making.
BEGIN;

-- CreateEnum
CREATE TYPE "CablePartKind" AS ENUM ('CONNECTOR', 'CABLE_STOCK');

-- CreateEnum
CREATE TYPE "CableAttachmentKind" AS ENUM ('IMAGE', 'PDF');

-- CreateEnum
CREATE TYPE "CableWorkLocation" AS ENUM ('LOUISE', 'PGM');

-- CreateTable
CREATE TABLE "CablePart" (
    "id" TEXT NOT NULL,
    "kind" "CablePartKind" NOT NULL,
    "name" TEXT NOT NULL,
    "partNumber" TEXT,
    "details" JSONB,
    "currentImageId" TEXT,

    CONSTRAINT "CablePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CablePartImage" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "CablePartImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CableType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinsPerCable" INTEGER NOT NULL,
    "pinCountFromDrawing" BOOLEAN NOT NULL DEFAULT false,
    "requiresDrawing" BOOLEAN NOT NULL DEFAULT false,
    "ratePerPin" DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    "wiringDesign" JSONB,

    CONSTRAINT "CableType_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CableType_positive_values" CHECK ("pinsPerCable" > 0 AND "ratePerPin" > 0)
);

-- CreateTable
CREATE TABLE "CableAttachment" (
    "cableTypeId" TEXT NOT NULL,
    "kind" "CableAttachmentKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "CableAttachment_pkey" PRIMARY KEY ("cableTypeId","kind")
);

-- CreateTable
CREATE TABLE "CableWork" (
    "id" TEXT NOT NULL,
    "completedOn" DATE NOT NULL,
    "cableTypeId" TEXT,
    "cableName" TEXT NOT NULL,
    "location" "CableWorkLocation",
    "quantity" INTEGER NOT NULL,
    "pinsPerCable" INTEGER NOT NULL,
    "totalPins" BIGINT NOT NULL,
    "ratePerPin" DECIMAL(6,2) NOT NULL,
    "earned" DECIMAL(16,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CableWork_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CableWork_valid_totals" CHECK (
        "quantity" > 0 AND "pinsPerCable" > 0 AND "ratePerPin" > 0
        AND "totalPins" = "quantity"::BIGINT * "pinsPerCable"
        AND "earned" = "totalPins" * "ratePerPin"
    )
);

-- CreateTable
CREATE TABLE "CablePayment" (
    "id" TEXT NOT NULL,
    "paidOn" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CablePayment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CablePayment_positive_amount" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "CableAuditEntry" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "CableAuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CablePart_currentImageId_key" ON "CablePart"("currentImageId");

-- CreateIndex
CREATE INDEX "CablePart_kind_name_idx" ON "CablePart"("kind", "name");

-- CreateIndex
CREATE INDEX "CablePartImage_partId_idx" ON "CablePartImage"("partId");

-- CreateIndex
CREATE UNIQUE INDEX "CableType_name_key" ON "CableType"("name");

-- CreateIndex
CREATE INDEX "CableWork_completedOn_createdAt_idx" ON "CableWork"("completedOn", "createdAt");

-- CreateIndex
CREATE INDEX "CableWork_cableTypeId_idx" ON "CableWork"("cableTypeId");

-- CreateIndex
CREATE INDEX "CablePayment_paidOn_createdAt_idx" ON "CablePayment"("paidOn", "createdAt");

-- CreateIndex
CREATE INDEX "CableAuditEntry_occurredAt_id_idx" ON "CableAuditEntry"("occurredAt", "id");

-- AddForeignKey
ALTER TABLE "CablePart" ADD CONSTRAINT "CablePart_currentImageId_fkey" FOREIGN KEY ("currentImageId") REFERENCES "CablePartImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePartImage" ADD CONSTRAINT "CablePartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "CablePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableAttachment" ADD CONSTRAINT "CableAttachment_cableTypeId_fkey" FOREIGN KEY ("cableTypeId") REFERENCES "CableType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableWork" ADD CONSTRAINT "CableWork_cableTypeId_fkey" FOREIGN KEY ("cableTypeId") REFERENCES "CableType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

