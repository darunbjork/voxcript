import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import type { ApiFailure } from '@transcribe/shared'
import { describe, expect, it } from 'vitest'
import { AppError } from './app-error.js'
import { errorHandler } from './error-handler.js'

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false })
  app.setErrorHandler(errorHandler)
  app.get('/expected', (): never => {
    throw new AppError('JOB_NOT_FOUND', 'Job not found')
  })
  app.get('/bug', (): never => {
    throw new Error('connection string postgres://user:hunter2@db')
  })
  app.get('/busy', (): never => {
    throw new AppError('QUEUE_FULL', 'The queue is full', {
      retryAt: new Date(Date.now() + 60_000),
    })
  })
  app.post('/echo', (request): unknown => request.body)
  return app
}

describe('errorHandler', () => {
  it('maps AppError to its status and safe message', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/expected' })
    expect(res.statusCode).toBe(404)
    const json = res.json<ApiFailure>()
    expect(json.success).toBe(false)
    expect(json.error).toEqual({
      code: 'JOB_NOT_FOUND',
      message: 'Job not found',
      retryAt: null,
    })
  })

  it('hides the message of unexpected errors', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/bug' })
    expect(res.statusCode).toBe(500)
    expect(res.body).not.toContain('hunter2')
    expect(res.json<ApiFailure>().error.message).toBe('Something went wrong')
  })

  it('returns retryAt and Retry-After for retryable errors', async () => {
    const res = await buildTestApp().inject({ method: 'GET', url: '/busy' })
    expect(res.statusCode).toBe(503)
    expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(59)
    expect(res.json<ApiFailure>().error.retryAt).not.toBeNull()
  })

  it('maps malformed JSON to 400 VALIDATION_FAILED', async () => {
    const res = await buildTestApp().inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{bad json',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<ApiFailure>().error.code).toBe('VALIDATION_FAILED')
  })
})
