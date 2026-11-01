import type { ProbeResult, ValidateLimits, ValidateResult } from './types.js'

const ALLOWED_FORMATS = new Set(['mp4', 'mov', 'webm', 'matroska', 'mkv', 'quicktime'])

export function validateMedia(
  probe: ProbeResult,
  limits: ValidateLimits,
  fileSizeBytes: number,
): ValidateResult {
  const maxBytes = limits.maxMegabytes * 1024 * 1024
  if (fileSizeBytes > maxBytes) {
    return { ok: false, code: 'TOO_LARGE' }
  }

  const formats = probe.formatName
    .toLowerCase()
    .split(',')
    .map((f) => f.trim())
  const formatOk = formats.some((f) => ALLOWED_FORMATS.has(f))
  if (!formatOk) {
    return { ok: false, code: 'INVALID_FORMAT' }
  }

  if (!probe.hasVideo) {
    return { ok: false, code: 'INVALID_FORMAT' }
  }

  if (!probe.hasAudio) {
    return { ok: false, code: 'NO_AUDIO' }
  }

  if (probe.durationSeconds > limits.maxSeconds + limits.durationToleranceSeconds) {
    return { ok: false, code: 'TOO_LONG' }
  }

  if (probe.videoHeight > limits.maxHeight) {
    return { ok: false, code: 'RESOLUTION_TOO_HIGH' }
  }

  return { ok: true, probe }
}
