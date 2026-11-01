import type { ApiErrorCode } from '@transcribe/shared'

export const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_FORMAT: 415,
  TOO_LARGE: 413,
  TOO_LONG: 422,
  NO_AUDIO: 422,
  RESOLUTION_TOO_HIGH: 422,
  QUEUE_FULL: 503,
  WORKER_DOWN: 503,
  RATE_LIMITED: 429,
  JOB_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL: 500,
}

export interface AppErrorOptions {
  cause?: unknown
  expected?: boolean
  retryAt?: Date
}

export class AppError extends Error {
  public readonly code: ApiErrorCode
  public readonly statusCode: number
  public readonly expected: boolean
  public readonly retryAt: Date | null

  public constructor(code: ApiErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.statusCode = STATUS_BY_CODE[code]
    this.expected = options.expected ?? code !== 'INTERNAL'
    this.retryAt = options.retryAt ?? null
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
