import type { FastifyInstance } from 'fastify'
import { AppError } from '../errors/app-error.js'
import { prisma } from '../db/prisma.js'
import { hashToken } from '../jobs/token.js'

function buildPlaceholderSrt(displayName: string, durationSeconds: number): string {
  const end = Math.max(1, Math.floor(durationSeconds))
  const endTs = `00:00:${String(end).padStart(2, '0')},000`
  return ['1', `00:00:00,000 --> ${endTs}`, `[placeholder] ${displayName}`, ''].join('\n')
}

export async function srtRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { id: string }
    Querystring: { accessToken?: string }
  }>('/api/v1/jobs/:id/srt', async (request, reply) => {
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

    if (job.status !== 'done') {
      throw new AppError('VALIDATION_FAILED', 'Job is not ready for download')
    }

    const body = buildPlaceholderSrt(job.displayName, job.durationSeconds)

    return reply
      .header('content-type', 'application/x-subrip; charset=utf-8')
      .header('content-disposition', `attachment; filename="${job.id}.srt"`)
      .send(body)
  })
}
