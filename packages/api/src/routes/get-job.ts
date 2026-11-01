import type { FastifyInstance } from 'fastify'
import { AppError } from '../errors/app-error.js'
import { prisma } from '../db/prisma.js'
import { hashToken } from '../jobs/token.js'
import { toJobView } from '../jobs/job-view.js'

export async function getJobRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { id: string }
    Querystring: { accessToken?: string }
  }>('/api/v1/jobs/:id', async (request, reply) => {
    const { id } = request.params
    const headerToken = request.headers['x-access-token']
    const token =
      typeof headerToken === 'string'
        ? headerToken
        : typeof request.query.accessToken === 'string'
          ? request.query.accessToken
          : null

    if (token === null) {
      throw new AppError('FORBIDDEN', 'Access token required')
    }

    const job = await prisma.job.findUnique({ where: { id } })
    if (job === null) {
      throw new AppError('JOB_NOT_FOUND', 'Job not found')
    }

    if (job.accessTokenHash !== hashToken(token)) {
      throw new AppError('FORBIDDEN', 'Invalid access token')
    }

    return reply.send({
      success: true,
      data: toJobView(job),
      error: null,
      correlationId: request.id,
    })
  })
}
