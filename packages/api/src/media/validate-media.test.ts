import { describe, expect, it } from 'vitest'
import { validateMedia } from './validate-media.js'
import type { ProbeResult, ValidateLimits } from './types.js'

const limits: ValidateLimits = {
  maxMegabytes: 60,
  maxSeconds: 60,
  maxHeight: 1080,
  maxFps: 60,
  durationToleranceSeconds: 0.5,
}

function baseProbe(overrides: Partial<ProbeResult> = {}): ProbeResult {
  return {
    durationSeconds: 12,
    videoHeight: 720,
    videoWidth: 1280,
    hasAudio: true,
    hasVideo: true,
    formatName: 'mp4',
    codecName: 'h264',
    ...overrides,
  }
}

describe('validateMedia', () => {
  it('accepts a normal short mp4 with audio', () => {
    const result = validateMedia(baseProbe(), limits, 5_000_000)
    expect(result.ok).toBe(true)
  })

  it('rejects oversize files', () => {
    const result = validateMedia(baseProbe(), limits, 70 * 1024 * 1024)
    expect(result).toEqual({ ok: false, code: 'TOO_LARGE' })
  })

  it('rejects unknown formats', () => {
    const result = validateMedia(baseProbe({ formatName: 'hls' }), limits, 1_000_000)
    expect(result).toEqual({ ok: false, code: 'INVALID_FORMAT' })
  })

  it('rejects files with no video stream', () => {
    const result = validateMedia(baseProbe({ hasVideo: false }), limits, 1_000_000)
    expect(result).toEqual({ ok: false, code: 'INVALID_FORMAT' })
  })

  it('rejects files with no audio stream', () => {
    const result = validateMedia(baseProbe({ hasAudio: false }), limits, 1_000_000)
    expect(result).toEqual({ ok: false, code: 'NO_AUDIO' })
  })

  it('rejects videos longer than the limit', () => {
    const result = validateMedia(baseProbe({ durationSeconds: 65 }), limits, 1_000_000)
    expect(result).toEqual({ ok: false, code: 'TOO_LONG' })
  })

  it('allows a small duration tolerance', () => {
    const result = validateMedia(baseProbe({ durationSeconds: 60.3 }), limits, 1_000_000)
    expect(result.ok).toBe(true)
  })

  it('rejects resolution above the limit', () => {
    const result = validateMedia(baseProbe({ videoHeight: 1440 }), limits, 1_000_000)
    expect(result).toEqual({ ok: false, code: 'RESOLUTION_TOO_HIGH' })
  })
})
