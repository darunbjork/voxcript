import type { RequestErrorCode, UploadRejectionCode } from './failure-view.js'

export type ApiErrorCode =
  RequestErrorCode | UploadRejectionCode | 'VALIDATION_FAILED' | 'FORBIDDEN' | 'NOT_FOUND'

export interface ApiErrorBody {
  readonly code: ApiErrorCode
  readonly message: string
  readonly retryAt: string | null
}

export interface ApiSuccess<TData> {
  readonly success: true
  readonly data: TData
  readonly error: null
  readonly correlationId: string
}

export interface ApiFailure {
  readonly success: false
  readonly data: null
  readonly error: ApiErrorBody
  readonly correlationId: string
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure
