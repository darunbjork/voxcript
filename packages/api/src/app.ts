import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import type { ApiEnv } from './env.js'
import { errorHandler } from './errors/error-handler.js'
import { statusRoutes } from './routes/status.js'
import { createJobRoutes } from './routes/create-job.js'
import { getJobRoutes } from './routes/get-job.js'
import { srtRoutes } from './routes/srt.js'

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

  await app.register(statusRoutes)
  await app.register(createJobRoutes)
  await app.register(getJobRoutes)
  await app.register(srtRoutes)

  return app
}
