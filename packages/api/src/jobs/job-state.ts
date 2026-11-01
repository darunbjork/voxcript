import type { JobStatus } from '@transcribe/shared'

const TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  queued: ['transcribing', 'cancelled', 'failed', 'expired'],
  transcribing: ['burning', 'queued', 'failed', 'cancelled'],
  burning: ['done', 'queued', 'failed', 'cancelled'],
  done: ['expired'],
  failed: ['expired'],
  cancelled: ['expired'],
  expired: [],
}

export class IllegalJobTransitionError extends Error {
  public readonly from: JobStatus
  public readonly to: JobStatus

  public constructor(from: JobStatus, to: JobStatus) {
    super(`Illegal job transition: ${from} -> ${to}`)
    this.name = 'IllegalJobTransitionError'
    this.from = from
    this.to = to
  }
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalJobTransitionError(from, to)
  }
}

export function isActive(status: JobStatus): boolean {
  return status === 'queued' || status === 'transcribing' || status === 'burning'
}

export function isFinished(status: JobStatus): boolean {
  return (
    status === 'done' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'expired'
  )
}
