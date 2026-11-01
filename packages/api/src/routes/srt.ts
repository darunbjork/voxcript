import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { AppError } from '../errors/app-error.js'
import { prisma } from '../db/prisma.js'
import { hashToken } from '../jobs/token.js'

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

    const mediaRoot = process.env.MEDIA_ROOT ?? '/tmp/voxcript'
    const srtPath = join(mediaRoot, id, 'result.srt')

    let body: Buffer
    try {
      body = await readFile(srtPath)
    } catch {
      throw new AppError('JOB_NOT_FOUND', 'SRT file not found')
    }

    return reply
      .header('content-type', 'application/x-subrip; charset=utf-8')
      .header('content-disposition', `attachment; filename="${id}.srt"`)
      .send(body)
  })
}
