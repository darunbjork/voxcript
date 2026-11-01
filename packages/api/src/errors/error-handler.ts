import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import type { ApiErrorCode, ApiFailure } from '@transcribe/shared'
import { AppError, isAppError } from './app-error.js'

function toAppError(error: FastifyError): AppError {
  if (isAppError(error)) return error

  if (error.validation !== undefined) {
    return new AppError('VALIDATION_FAILED', 'Request validation failed', {
      cause: error,
    })
  }

  const status = error.statusCode
  if (status !== undefined && status >= 400 && status < 500) {
    const code: ApiErrorCode =
      status === 403
        ? 'FORBIDDEN'
        : status === 404
          ? 'NOT_FOUND'
          : status === 413
            ? 'TOO_LARGE'
            : status === 415
              ? 'INVALID_FORMAT'
              : status === 429
                ? 'RATE_LIMITED'
                : 'VALIDATION_FAILED'
    return new AppError(code, error.message, { cause: error })
  }

  return new AppError('INTERNAL', 'Something went wrong', {
    cause: error,
    expected: false,
  })
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const appError = toAppError(error)

  if (appError.expected) {
    request.log.warn({ code: appError.code }, 'request failed (expected)')
  } else {
    request.log.error({ err: error }, 'request failed (unexpected)')
  }

  const body: ApiFailure = {
    success: false,
    data: null,
    error: {
      code: appError.code,
      message: appError.expected ? appError.message : 'Something went wrong',
      retryAt: appError.retryAt === null ? null : appError.retryAt.toISOString(),
    },
    correlationId: request.id,
  }

  if (appError.retryAt !== null) {
    const seconds = Math.max(
      1,
      Math.ceil((appError.retryAt.getTime() - Date.now()) / 1000),
    )
    void reply.header('Retry-After', String(seconds))
  }

  void reply.status(appError.statusCode).send(body)
}
