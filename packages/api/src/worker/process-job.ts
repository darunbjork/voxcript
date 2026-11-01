import type { Job } from '@prisma/client'
import { transitionJob } from '../jobs/job-repository.js'

export async function processJob(job: Job): Promise<void> {
  const moved = await transitionJob(job.id, 'transcribing', 'burning')
  if (moved === null) return

  await transitionJob(moved.id, 'burning', 'done', {
    srtBytes: 128,
    mp4Bytes: 1024,
    hasPoster: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
}
