import type { JobFailureCode, UploadLimits } from './failure-view.js'

export const JOB_STATUSES = [
  'queued',
  'transcribing',
  'burning',
  'done',
  'failed',
  'cancelled',
  'expired',
] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const SUBTITLE_LANGUAGES = ['auto', 'sv', 'en'] as const
export type SubtitleLanguage = (typeof SUBTITLE_LANGUAGES)[number]

export interface EstimateRange {
  readonly minSeconds: number
  readonly maxSeconds: number
}

export interface StatusResponse {
  readonly accepting: boolean
  readonly reason: 'QUEUE_FULL' | 'WORKER_DOWN' | null
  readonly queueLength: number
  readonly queueMax: number
  readonly waitEstimateRange: EstimateRange | null
  readonly limits: UploadLimits
}

export interface CreateJobResponse {
  readonly id: string
  readonly status: JobStatus
  readonly queuePosition: number
  readonly waitEstimateRange: EstimateRange | null
  readonly processingEstimateRange: EstimateRange | null
  readonly accessToken: string
}

export interface JobFailure {
  readonly code: JobFailureCode
  readonly correlationId: string
}

export interface JobFiles {
  readonly mp4Bytes: number
  readonly srtBytes: number
}

export interface JobView {
  readonly id: string
  readonly status: JobStatus
  readonly progress: number | null
  readonly queuePosition: number | null
  readonly waitEstimateRange: EstimateRange | null
  readonly processingEstimateRange: EstimateRange | null
  readonly failure: JobFailure | null
  readonly expiresAt: string | null
  readonly posterUrl: string | null
  readonly files: JobFiles | null
  readonly displayName: string
  readonly durationSeconds: number
  readonly videoHeight: number
  readonly language: SubtitleLanguage
  readonly detectedLanguage: string | null
}
