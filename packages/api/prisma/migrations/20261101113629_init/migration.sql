-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'transcribing', 'burning', 'done', 'failed', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "failureCode" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'auto',
    "detectedLanguage" TEXT,
    "displayName" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "videoHeight" INTEGER NOT NULL,
    "srtBytes" INTEGER,
    "mp4Bytes" INTEGER,
    "hasPoster" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "workerId" TEXT NOT NULL,
    "beatAt" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("workerId")
);

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Job_ownerKey_idx" ON "Job"("ownerKey");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx" ON "Job"("expiresAt");
