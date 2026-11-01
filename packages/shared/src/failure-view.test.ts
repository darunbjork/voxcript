import { describe, expect, it } from 'vitest'
import {
  JOB_FAILURE_CODES,
  JOB_FAILURE_VIEWS,
  UPLOAD_REJECTION_CODES,
  UPLOAD_REJECTION_MESSAGES,
  isRetryable,
} from './failure-view.js'

describe('failure view contract', () => {
  it('has a complete non-empty view for every job failure code', () => {
    for (const code of JOB_FAILURE_CODES) {
      const view = JOB_FAILURE_VIEWS[code]
      expect(view.title.length).toBeGreaterThan(0)
      expect(view.body.length).toBeGreaterThan(0)
      expect(view.actionLabel.length).toBeGreaterThan(0)
    }
  })

  it('builds upload rejection messages from the live limits', () => {
    const limits = { maxMegabytes: 150, maxSeconds: 45 }
    expect(UPLOAD_REJECTION_MESSAGES.TOO_LARGE(limits)).toContain('150')
    expect(UPLOAD_REJECTION_MESSAGES.TOO_LONG(limits)).toContain('45')
    for (const code of UPLOAD_REJECTION_CODES) {
      expect(UPLOAD_REJECTION_MESSAGES[code](limits).length).toBeGreaterThan(0)
    }
  })

  it('treats only queue-full and rate-limited as retryable', () => {
    expect(isRetryable('QUEUE_FULL')).toBe(true)
    expect(isRetryable('RATE_LIMITED')).toBe(true)
    expect(isRetryable('WORKER_DOWN')).toBe(false)
  })
})
