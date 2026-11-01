import { runWorkerLoop } from './loop.js'

const controller = new AbortController()

process.on('SIGTERM', () => {
  controller.abort()
})
process.on('SIGINT', () => {
  controller.abort()
})

runWorkerLoop(controller.signal)
  .then(() => {
    process.exit(0)
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `worker fatal: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exit(1)
  })
