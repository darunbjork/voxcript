import { claimNextJob } from '../jobs/job-repository.js'
import { beat } from './heartbeat.js'
import { processJob } from './process-job.js'

const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`
const VERSION = process.env.VERSION ?? '0.1.0'
const POLL_MS = 2_000
const BEAT_MS = 15_000

export async function runWorkerLoop(signal: AbortSignal): Promise<void> {
  let lastBeat = 0

  while (!signal.aborted) {
    const now = Date.now()
    if (now - lastBeat >= BEAT_MS) {
      await beat(WORKER_ID, VERSION)
      lastBeat = now
    }

    const job = await claimNextJob(WORKER_ID)
    if (job !== null) {
      try {
        await processJob(job)
      } catch {
        await transitionToFailed(job.id)
      }
    } else {
      await sleep(POLL_MS, signal)
    }
  }
}

async function transitionToFailed(id: string): Promise<void> {
  const { transitionJob } = await import('../jobs/job-repository.js')
  await transitionJob(id, 'transcribing', 'failed', {
    failureCode: 'INTERNAL',
  })
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve()
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
