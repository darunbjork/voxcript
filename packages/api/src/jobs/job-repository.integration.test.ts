import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../db/prisma.js'
import { claimNextJob, createJob } from './job-repository.js'

function makeId(): string {
  return randomBytes(16).toString('hex')
}

describe('claimNextJob (integration)', () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.job.deleteMany()
    await prisma.workerHeartbeat.deleteMany()
  })

  it('returns null when the queue is empty', async () => {
    const result = await claimNextJob('worker-1')
    expect(result).toBeNull()
  })

  it('claims a single queued job and moves it to transcribing', async () => {
    const id = makeId()
    await createJob({
      id,
      correlationId: makeId(),
      language: 'auto',
      displayName: 'test.mp4',
      ownerKey: makeId(),
      accessTokenHash: makeId(),
      durationSeconds: 10,
      videoHeight: 720,
    })

    const claimed = await claimNextJob('worker-1')
    expect(claimed).not.toBeNull()
    expect(claimed!.id).toBe(id)
    expect(claimed!.status).toBe('transcribing')
    expect(claimed!.attempts).toBe(1)
    expect(claimed!.startedAt).not.toBeNull()
  })

  it('five concurrent claimers on one job yield exactly one winner', async () => {
    const id = makeId()
    await createJob({
      id,
      correlationId: makeId(),
      language: 'auto',
      displayName: 'race.mp4',
      ownerKey: makeId(),
      accessTokenHash: makeId(),
      durationSeconds: 8,
      videoHeight: 720,
    })

    const workers = Array.from({ length: 5 }, (_, i) => `worker-${String(i)}`)
    const results = await Promise.all(workers.map((w) => claimNextJob(w)))

    const winners = results.filter((r) => r !== null)
    const losers = results.filter((r) => r === null)

    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(4)
    expect(winners[0]!.id).toBe(id)
    expect(winners[0]!.status).toBe('transcribing')
  })

  it('two workers can claim two different jobs concurrently', async () => {
    const id1 = makeId()
    const id2 = makeId()

    await createJob({
      id: id1,
      correlationId: makeId(),
      language: 'auto',
      displayName: 'a.mp4',
      ownerKey: makeId(),
      accessTokenHash: makeId(),
      durationSeconds: 5,
      videoHeight: 720,
    })
    await createJob({
      id: id2,
      correlationId: makeId(),
      language: 'auto',
      displayName: 'b.mp4',
      ownerKey: makeId(),
      accessTokenHash: makeId(),
      durationSeconds: 6,
      videoHeight: 720,
    })

    const [a, b] = await Promise.all([claimNextJob('worker-a'), claimNextJob('worker-b')])

    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a!.id).not.toBe(b!.id)
    expect(new Set([a!.id, b!.id])).toEqual(new Set([id1, id2]))
  })
})
