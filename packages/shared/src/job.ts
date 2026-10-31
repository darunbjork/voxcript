import type { FailureStage, FailureView } from './failure-view.js'
import { createFailureView } from './failure-view.js'

export type JobStatus = 'queued' | 'processing' | 'failed' | 'complete'

export const JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'processing',
  'failed',
  'complete',
]

export interface TranscriptionJob {
  jobId: string
  status: JobStatus
  stage?: FailureStage | undefined
  progress?: number | undefined
  failureCode?: string | undefined
  failureMessage?: string | undefined
  createdAt: string
  updatedAt: string
}

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === 'string' && (JOB_STATUSES as readonly string[]).includes(value)
}

export function toFailureView(job: TranscriptionJob): FailureView {
  return createFailureView({
    jobId: job.jobId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    failureCode: job.failureCode,
    failureMessage: job.failureMessage,
  })
}
