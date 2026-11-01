import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { ApiEnv } from './env.js'
import { errorHandler } from './errors/error-handler.js'

export async function buildApp(env: ApiEnv): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    genReqId: () => randomUUID(),
    requestIdHeader: false,
  })

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => {
    return { status: 'ok' }
  })

  app.get('/ready', async () => {
    return { status: 'ready' }
  })

  return app
}
