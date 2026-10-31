import { describe, expect, it } from 'vitest'
import {
  createFailureView,
  describeFailureView,
  FAILURE_STAGES,
  isFailureViewComplete,
} from './failure-view.js'

describe('failure view contract', () => {
  it('rejects a missing job identifier', () => {
    expect(() => createFailureView({ jobId: '' })).toThrow('jobId is required')
  })

  it('rejects an invalid stage', () => {
    expect(() =>
      createFailureView({ jobId: 'job-123', stage: 'processing' as never }),
    ).toThrow('invalid stage')
  })

  it('rejects progress outside zero through one hundred', () => {
    expect(() => createFailureView({ jobId: 'job-123', progress: 101 })).toThrow(
      'progress must be between 0 and 100',
    )
  })

  it('creates a normalized view for every stage', () => {
    for (const stage of FAILURE_STAGES) {
      const view = createFailureView({
        jobId: 'job-123',
        stage,
        status: stage === 'complete' ? 'complete' : 'processing',
      })
      expect(view.stage).toBe(stage)
      expect(view.jobId).toBe('job-123')
      expect(isFailureViewComplete(view)).toBe(stage === 'complete')
    }
  })

  it('describes a failed job with its stage and message', () => {
    const view = createFailureView({
      jobId: 'job-9',
      status: 'failed',
      stage: 'uploading',
      failureMessage: 'file too large',
    })
    expect(describeFailureView(view)).toContain('failed')
    expect(describeFailureView(view)).toContain('uploading')
    expect(describeFailureView(view)).toContain('file too large')
  })
})
