import { describe, expect, it } from 'vitest'
import { mapProcessFailure } from './job-failure.js'
import type { ProcessFailureKind, RunProcessFailure } from './run-process.js'

function failure(
  kind: ProcessFailureKind,
  signal: NodeJS.Signals | null = null,
): RunProcessFailure {
  return {
    ok: false,
    kind,
    exitCode: null,
    signal,
    stdout: '',
    stderrTail: '',
    durationMs: 1,
  }
}

describe('mapProcessFailure', () => {
  it('maps timeouts and aborts regardless of stage', () => {
    expect(mapProcessFailure('transcribe', failure('TIMED_OUT'))).toBe('TIMED_OUT')
    expect(mapProcessFailure('encode', failure('ABORTED'))).toBe('CANCELLED')
  })

  it('maps a stray SIGKILL to OUT_OF_MEMORY', () => {
    expect(mapProcessFailure('encode', failure('SIGNALED', 'SIGKILL'))).toBe(
      'OUT_OF_MEMORY',
    )
  })

  it('maps a non-zero exit by stage', () => {
    expect(mapProcessFailure('transcribe', failure('NON_ZERO_EXIT'))).toBe(
      'TRANSCRIPTION_FAILED',
    )
    expect(mapProcessFailure('encode', failure('NON_ZERO_EXIT'))).toBe('ENCODING_FAILED')
  })

  it('maps a missing binary to INTERNAL', () => {
    expect(mapProcessFailure('transcribe', failure('SPAWN_FAILED'))).toBe('INTERNAL')
  })
})
