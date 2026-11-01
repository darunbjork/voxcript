import type { Job } from '@prisma/client'
import type { JobView, JobStatus, SubtitleLanguage } from '@transcribe/shared'

export function toJobView(job: Job): JobView {
  return {
    id: job.id,
    status: job.status as JobStatus,
    progress: null,
    queuePosition: null,
    waitEstimateRange: null,
    processingEstimateRange: null,
    failure:
      job.failureCode === null
        ? null
        : {
            code: job.failureCode as NonNullable<JobView['failure']>['code'],
            correlationId: job.correlationId,
          },
    expiresAt: job.expiresAt === null ? null : job.expiresAt.toISOString(),
    posterUrl: job.hasPoster ? `/api/v1/jobs/${job.id}/poster` : null,
    files:
      job.srtBytes === null || job.mp4Bytes === null
        ? null
        : {
            mp4Bytes: job.mp4Bytes,
            srtBytes: job.srtBytes,
          },
    displayName: job.displayName,
    durationSeconds: job.durationSeconds,
    videoHeight: job.videoHeight,
    language: job.language as SubtitleLanguage,
    detectedLanguage: job.detectedLanguage,
  }
}
