// @ts-ignore Node.js type definitions are not available in this package.
import { describe, it } from 'node:test'
// @ts-ignore Node.js type definitions are not available in this package.
import assert from 'node:assert/strict'
import {
  JOB_FAILURE_CODES,
  JOB_FAILURE_VIEWS,
  UPLOAD_REJECTION_CODES,
  UPLOAD_REJECTION_MESSAGES,
  isRetryable,
} from './failure-view.js'

describe('failure view contract', () => {
  it('has a complete, non-empty view for every job failure code', () => {
    for (const code of JOB_FAILURE_CODES) {
      const view = JOB_FAILURE_VIEWS[code]
      assert.ok(view.title.length > 0)
      assert.ok(view.body.length > 0)
      assert.ok(view.actionLabel.length > 0)
    }
  })

  it('builds upload rejection messages from the live limits', () => {
    const limits = { maxMegabytes: 150, maxSeconds: 45 }
    assert.ok(UPLOAD_REJECTION_MESSAGES.TOO_LARGE(limits).includes('150'))
    assert.ok(UPLOAD_REJECTION_MESSAGES.TOO_LONG(limits).includes('45'))
    for (const code of UPLOAD_REJECTION_CODES) {
      assert.ok(UPLOAD_REJECTION_MESSAGES[code](limits).length > 0)
    }
  })

  it('treats only queue-full and rate-limited as retryable', () => {
    assert.equal(isRetryable('QUEUE_FULL'), true)
    assert.equal(isRetryable('RATE_LIMITED'), true)
    assert.equal(isRetryable('WORKER_DOWN'), false)
  })
})
