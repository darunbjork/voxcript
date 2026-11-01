import type { UploadRejectionCode } from '@transcribe/shared'

export interface ProbeResult {
  readonly durationSeconds: number
  readonly videoHeight: number
  readonly videoWidth: number
  readonly hasAudio: boolean
  readonly hasVideo: boolean
  readonly formatName: string
  readonly codecName: string | null
}

export interface ValidateLimits {
  readonly maxMegabytes: number
  readonly maxSeconds: number
  readonly maxHeight: number
  readonly maxFps: number
  readonly durationToleranceSeconds: number
}

export type ValidateResult =
  { ok: true; probe: ProbeResult } | { ok: false; code: UploadRejectionCode }
