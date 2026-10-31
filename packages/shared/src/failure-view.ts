export type FailureStage =
  'received' | 'transcoding' | 'uploading' | 'transcription' | 'complete'

export type FailureViewStatus = 'queued' | 'processing' | 'failed' | 'complete'

export const FAILURE_STAGES: readonly FailureStage[] = [
  'received',
  'transcoding',
  'uploading',
  'transcription',
  'complete',
]

export const FAILURE_VIEW_STATUSES: readonly FailureViewStatus[] = [
  'queued',
  'processing',
  'failed',
  'complete',
]

export interface FailureView {
  jobId: string
  status: FailureViewStatus
  stage: FailureStage
  failureCode?: string
  failureMessage?: string
  progress?: number
  createdAt: string
  updatedAt: string
}

export const FAILURE_VIEW_ERROR_CODES = [
  'JOB_ID_REQUIRED',
  'INVALID_STAGE',
  'INVALID_STATUS',
  'PROGRESS_RANGE',
  'FAILURE_MESSAGE_LENGTH',
] as const

export type FailureViewErrorCode = (typeof FAILURE_VIEW_ERROR_CODES)[number]

export interface FailureViewError {
  code: FailureViewErrorCode
  message: string
  jobId: string
}

export interface FailureViewInput {
  jobId: string
  stage?: FailureStage | undefined
  status?: FailureViewStatus | undefined
  progress?: number | undefined
  failureMessage?: string | undefined
  failureCode?: string | undefined
}

export function createFailureView(input: FailureViewInput): FailureView {
  if (!input.jobId) {
    throw new Error('jobId is required')
  }
  if (input.stage !== undefined && !FAILURE_STAGES.includes(input.stage)) {
    throw new Error(`invalid stage: ${input.stage}`)
  }
  if (input.status !== undefined && !FAILURE_VIEW_STATUSES.includes(input.status)) {
    throw new Error(`invalid status: ${input.status}`)
  }
  if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
    throw new Error('progress must be between 0 and 100')
  }
  if (input.failureMessage !== undefined && input.failureMessage.length > 1000) {
    throw new Error('failure message must be 1000 characters or fewer')
  }
  const now = new Date().toISOString()
  const view: FailureView = {
    jobId: input.jobId,
    status: input.status ?? 'processing',
    stage: input.stage ?? 'received',
    createdAt: now,
    updatedAt: now,
  }
  if (input.failureCode !== undefined) {
    view.failureCode = input.failureCode
  }
  if (input.failureMessage !== undefined) {
    view.failureMessage = input.failureMessage
  }
  if (input.progress !== undefined) {
    view.progress = input.progress
  }
  return view
}

export function isFailureViewComplete(view: FailureView): boolean {
  return view.status === 'complete'
}

export function describeFailureView(view: FailureView): string {
  if (isFailureViewComplete(view)) {
    return `Transcription complete for job ${view.jobId}.`
  }
  if (view.status === 'failed' && view.failureMessage) {
    return `Job ${view.jobId} failed at ${view.stage}: ${view.failureMessage}`
  }
  return `Job ${view.jobId} is ${view.status} at ${view.stage}.`
}
