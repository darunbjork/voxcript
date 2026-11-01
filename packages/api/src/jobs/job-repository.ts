import type { Job, JobStatus, Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { assertTransition } from './job-state.js'

export type CreateJobInput = {
  id: string
  correlationId: string
  language: string
  displayName: string
  ownerKey: string
  accessTokenHash: string
  durationSeconds: number
  videoHeight: number
}

export async function claimNextJob(workerId: string): Promise<Job | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Job[]>`
      SELECT * FROM "Job"
      WHERE status = 'queued'
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `

    const job = rows[0]
    if (job === undefined) return null

    assertTransition(job.status, 'transcribing')

    const updated = await tx.job.update({
      where: { id: job.id },
      data: {
        status: 'transcribing',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })

    void workerId
    return updated
  })
}

export async function transitionJob(
  id: string,
  from: JobStatus,
  to: JobStatus,
  extra: Prisma.JobUpdateInput = {},
): Promise<Job | null> {
  assertTransition(from, to)

  const result = await prisma.job.updateMany({
    where: { id, status: from },
    data: {
      status: to,
      ...extra,
      ...(to === 'done' || to === 'failed' || to === 'cancelled'
        ? { finishedAt: new Date() }
        : {}),
    },
  })

  if (result.count === 0) return null
  return prisma.job.findUnique({ where: { id } })
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  return prisma.job.create({
    data: {
      id: input.id,
      correlationId: input.correlationId,
      language: input.language,
      displayName: input.displayName,
      ownerKey: input.ownerKey,
      accessTokenHash: input.accessTokenHash,
      durationSeconds: input.durationSeconds,
      videoHeight: input.videoHeight,
      status: 'queued',
    },
  })
}
