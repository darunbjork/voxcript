import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Job } from '@prisma/client'
import { transitionJob } from '../jobs/job-repository.js'
import { runPipeline } from '../pipeline/run-pipeline.js'

export async function processJob(job: Job): Promise<void> {
  const mediaRoot = process.env.MEDIA_ROOT ?? '/tmp/voxcript'
  const workDir = join(mediaRoot, job.id)
  const inputPath = join(workDir, 'input')

  try {
    const result = await runPipeline(job.id, inputPath, job.language)

    if (!result.ok) {
      await transitionJob(job.id, 'transcribing', 'failed', {
        failureCode: result.failureCode,
      })
      return
    }

    const burning = await transitionJob(job.id, 'transcribing', 'burning')
    if (burning === null) return

    await transitionJob(burning.id, 'burning', 'done', {
      srtBytes: result.srtBytes,
      mp4Bytes: 0,
      hasPoster: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
  } finally {
    await rm(join(workDir, 'audio.wav'), { force: true }).catch(() => undefined)
    await rm(join(workDir, 'input'), { force: true }).catch(() => undefined)
  }
}
