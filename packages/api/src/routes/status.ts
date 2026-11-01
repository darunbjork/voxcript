import type { FastifyInstance } from 'fastify'
import type { StatusResponse } from '@transcribe/shared'
import { prisma } from '../db/prisma.js'

const DEFAULT_LIMITS = {
  maxMegabytes: 60,
  maxSeconds: 60,
}

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/status', async (_request, reply) => {
    const queueLength = await prisma.job.count({
      where: { status: 'queued' },
    })

    const freshWorkers = await prisma.workerHeartbeat.count({
      where: {
        beatAt: { gte: new Date(Date.now() - 60_000) },
      },
    })

    const queueMax = 20
    const accepting = queueLength < queueMax && freshWorkers > 0
    const reason =
      queueLength >= queueMax ? 'QUEUE_FULL' : freshWorkers === 0 ? 'WORKER_DOWN' : null

    const body: StatusResponse = {
      accepting,
      reason,
      queueLength,
      queueMax,
      waitEstimateRange: null,
      limits: DEFAULT_LIMITS,
    }

    return reply.send({
      success: true,
      data: body,
      error: null,
      correlationId: _request.id,
    })
  })
}
