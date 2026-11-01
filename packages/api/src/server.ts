import { buildApp } from './app.js'
import { loadApiEnv } from './env.js'

async function main(): Promise<void> {
  const env = loadApiEnv()
  const app = await buildApp(env)

  let shuttingDown = false

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'graceful shutdown started')
    try {
      await app.close()
      app.log.info('graceful shutdown complete')
      process.exit(0)
    } catch (error: unknown) {
      app.log.error({ err: error }, 'graceful shutdown failed')
      process.exit(1)
    }
  }

  process.on('SIGTERM', (signal) => {
    void shutdown(signal)
  })
  process.on('SIGINT', (signal) => {
    void shutdown(signal)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    app.log.fatal({ err: reason }, 'unhandledRejection — exiting')
    process.exit(1)
  })
  process.on('uncaughtException', (error: Error) => {
    app.log.fatal({ err: error }, 'uncaughtException — exiting')
    process.exit(1)
  })

  await app.listen({ host: '0.0.0.0', port: env.PORT })
}

main().catch((error: unknown) => {
  process.stderr.write(
    `fatal startup error: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exit(1)
})
