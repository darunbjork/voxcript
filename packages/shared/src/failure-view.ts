export const UPLOAD_REJECTION_CODES = [
  'INVALID_FORMAT',
  'TOO_LARGE',
  'TOO_LONG',
  'NO_AUDIO',
  'RESOLUTION_TOO_HIGH',
] as const
export type UploadRejectionCode = (typeof UPLOAD_REJECTION_CODES)[number]

export const JOB_FAILURE_CODES = [
  'NO_SPEECH',
  'TRANSCRIPTION_FAILED',
  'ENCODING_FAILED',
  'TIMED_OUT',
  'OUT_OF_MEMORY',
  'SERVER_RESTARTED',
  'CANCELLED',
  'INTERNAL',
] as const
export type JobFailureCode = (typeof JOB_FAILURE_CODES)[number]

export interface UploadLimits {
  readonly maxMegabytes: number
  readonly maxSeconds: number
}

export const UPLOAD_REJECTION_MESSAGES: Record<
  UploadRejectionCode,
  (limits: UploadLimits) => string
> = {
  INVALID_FORMAT: () => 'This file is not a supported video. Use MP4, MOV, WEBM or MKV.',
  TOO_LARGE: (limits) => `The file is larger than ${String(limits.maxMegabytes)} MB.`,
  TOO_LONG: (limits) => `The video is longer than ${String(limits.maxSeconds)} seconds.`,
  NO_AUDIO: () =>
    'The video has no audio track to transcribe. Upload a video that has sound.',
  RESOLUTION_TOO_HIGH: () => 'The video resolution is too high. Try 1080p or lower.',
}

export type FailureActionKind = 'UPLOAD_DIFFERENT' | 'UPLOAD_AGAIN'

export interface FailureView {
  readonly title: string
  readonly body: string
  readonly hint: string | null
  readonly actionKind: FailureActionKind
  readonly actionLabel: string
}

export const JOB_FAILURE_VIEWS: Record<JobFailureCode, FailureView> = {
  NO_SPEECH: {
    title: 'No speech found',
    body: 'No speech was detected in the video.',
    hint: 'Try a clip where someone speaks clearly. Music alone cannot be transcribed.',
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload a different video',
  },
  TRANSCRIPTION_FAILED: {
    title: 'We could not transcribe this video',
    body: 'Please try another file. If it keeps happening, quote the reference below.',
    hint: null,
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload another video',
  },
  ENCODING_FAILED: {
    title: 'We could not add the subtitles',
    body: 'Please try another file. If it keeps happening, quote the reference below.',
    hint: null,
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload another video',
  },
  TIMED_OUT: {
    title: 'Processing took too long',
    body: 'Processing took too long and was stopped.',
    hint: 'Try a shorter or lower-resolution clip.',
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload a different video',
  },
  OUT_OF_MEMORY: {
    title: 'Video too demanding',
    body: 'The server ran out of memory processing this video.',
    hint: 'Please try again later, or try a shorter clip.',
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload a different video',
  },
  SERVER_RESTARTED: {
    title: 'Server restarted',
    body: 'The server restarted while processing. Please upload again.',
    hint: 'Your video was not kept.',
    actionKind: 'UPLOAD_AGAIN',
    actionLabel: 'Upload again',
  },
  CANCELLED: {
    title: 'Processing was cancelled',
    body: 'You cancelled this job. Your video has been deleted.',
    hint: null,
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload a new video',
  },
  INTERNAL: {
    title: 'Something went wrong on our side',
    body: 'Please try again later. If it keeps happening, quote the reference below.',
    hint: null,
    actionKind: 'UPLOAD_DIFFERENT',
    actionLabel: 'Upload another video',
  },
}

export type RetryableRequestErrorCode = 'QUEUE_FULL' | 'RATE_LIMITED'

export type RequestErrorCode =
  RetryableRequestErrorCode | 'WORKER_DOWN' | 'JOB_NOT_FOUND' | 'INTERNAL'

export function isRetryable(code: RequestErrorCode): code is RetryableRequestErrorCode {
  return code === 'QUEUE_FULL' || code === 'RATE_LIMITED'
}
