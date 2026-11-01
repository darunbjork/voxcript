import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import type { CreateJobResponse } from '@transcribe/shared'
import { UPLOAD_REJECTION_MESSAGES } from '@transcribe/shared'
import { AppError } from '../errors/app-error.js'
import { prisma } from '../db/prisma.js'
import { createJob } from '../jobs/job-repository.js'
import { generateAccessToken, generateJobId, hashToken } from '../jobs/token.js'
import { probeMedia } from '../media/probe-media.js'
import { validateMedia } from '../media/validate-media.js'

const MAX_BYTES = 60 * 1024 * 1024
const MAX_SECONDS = 60
const MAX_HEIGHT = 1080
const PROBE_TIMEOUT_MS = 15_000

export async function createJobRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: MAX_BYTES,
    },
  })

  app.post('/api/v1/jobs', async (request, reply) => {
    const data = await request.file()
    if (data === undefined) {
      throw new AppError('VALIDATION_FAILED', 'Expected a single file field')
    }

    const displayName = data.filename || 'upload.mp4'
    const tempPath = join(tmpdir(), `voxcript-${generateJobId()}.upload`)

    try {
      await pipeline(data.file, createWriteStream(tempPath))

      if (data.file.truncated) {
        throw new AppError(
          'TOO_LARGE',
          UPLOAD_REJECTION_MESSAGES.TOO_LARGE({
            maxMegabytes: 60,
            maxSeconds: MAX_SECONDS,
          }),
        )
      }

      const probeResult = await probeMedia(tempPath, PROBE_TIMEOUT_MS)
      if (!probeResult.ok) {
        throw new AppError(
          'INVALID_FORMAT',
          UPLOAD_REJECTION_MESSAGES.INVALID_FORMAT({
            maxMegabytes: 60,
            maxSeconds: MAX_SECONDS,
          }),
        )
      }

      const validation = validateMedia(
        probeResult.probe,
        {
          maxMegabytes: 60,
          maxSeconds: MAX_SECONDS,
          maxHeight: MAX_HEIGHT,
          maxFps: 60,
          durationToleranceSeconds: 0.5,
        },
        data.file.bytesRead,
      )

      if (!validation.ok) {
        throw new AppError(
          validation.code,
          UPLOAD_REJECTION_MESSAGES[validation.code]({
            maxMegabytes: 60,
            maxSeconds: MAX_SECONDS,
          }),
        )
      }

      const queueLength = await prisma.job.count({
        where: { status: 'queued' },
      })
      if (queueLength >= 20) {
        throw new AppError('QUEUE_FULL', 'The queue is full', {
          retryAt: new Date(Date.now() + 30_000),
        })
      }

      const accessToken = generateAccessToken()
      const jobId = generateJobId()
      const correlationId = request.id

      await createJob({
        id: jobId,
        correlationId,
        language: 'auto',
        displayName,
        ownerKey: hashToken(accessToken),
        accessTokenHash: hashToken(accessToken),
        durationSeconds: validation.probe.durationSeconds,
        videoHeight: validation.probe.videoHeight,
      })

      const body: CreateJobResponse = {
        id: jobId,
        status: 'queued',
        queuePosition: queueLength + 1,
        waitEstimateRange: null,
        processingEstimateRange: null,
        accessToken,
      }

      return reply.status(201).send({
        success: true,
        data: body,
        error: null,
        correlationId,
      })
    } finally {
      await unlink(tempPath).catch(() => undefined)
    }
  })
}
