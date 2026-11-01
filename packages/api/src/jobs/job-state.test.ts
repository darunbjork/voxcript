import { JOB_STATUSES } from '@transcribe/shared'
import { describe, expect, it } from 'vitest'
import {
  assertTransition,
  canTransition,
  IllegalJobTransitionError,
  isActive,
  isFinished,
} from './job-state.js'

describe('job state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('queued', 'transcribing')).toBe(true)
    expect(canTransition('transcribing', 'burning')).toBe(true)
    expect(canTransition('burning', 'done')).toBe(true)
    expect(canTransition('done', 'expired')).toBe(true)
  })

  it('rejects moving a finished job back into processing', () => {
    expect(() => {
      assertTransition('done', 'queued')
    }).toThrow(IllegalJobTransitionError)
    expect(() => {
      assertTransition('failed', 'transcribing')
    }).toThrow(IllegalJobTransitionError)
  })

  it('treats expired as a dead end', () => {
    for (const to of JOB_STATUSES) {
      expect(canTransition('expired', to)).toBe(false)
    }
  })

  it('classifies every status as exactly one of active or finished', () => {
    for (const status of JOB_STATUSES) {
      expect(isActive(status)).not.toBe(isFinished(status))
    }
  })
})
