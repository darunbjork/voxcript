import { z } from 'zod'
import { runProcess } from '../process/run-process.js'
import type { ProbeResult } from './types.js'

const FfprobeStreamSchema = z.object({
  codec_type: z.string().optional(),
  codec_name: z.string().optional(),
  height: z.number().optional(),
  width: z.number().optional(),
  avg_frame_rate: z.string().optional(),
})

const FfprobeFormatSchema = z.object({
  duration: z.string().optional(),
  format_name: z.string().optional(),
  size: z.string().optional(),
})

const FfprobeJsonSchema = z.object({
  streams: z.array(FfprobeStreamSchema).default([]),
  format: FfprobeFormatSchema.optional(),
})

export type ProbeMediaResult =
  | { ok: true; probe: ProbeResult }
  | { ok: false; reason: 'PROBE_FAILED' | 'INVALID_JSON' }

export async function probeMedia(
  filePath: string,
  timeoutMs: number,
): Promise<ProbeMediaResult> {
  const result = await runProcess({
    command: 'ffprobe',
    args: [
      '-v',
      'error',
      '-protocol_whitelist',
      'file',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ],
    timeoutMs,
    maxStdoutBytes: 256_000,
  })

  if (!result.ok) {
    return { ok: false, reason: 'PROBE_FAILED' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    return { ok: false, reason: 'INVALID_JSON' }
  }

  const json = FfprobeJsonSchema.safeParse(parsed)
  if (!json.success) {
    return { ok: false, reason: 'INVALID_JSON' }
  }

  const data = json.data
  const videoStream = data.streams.find((s) => s.codec_type === 'video')
  const audioStream = data.streams.find((s) => s.codec_type === 'audio')

  const duration = Number(data.format?.duration ?? 0)
  if (!Number.isFinite(duration) || duration <= 0) {
    return { ok: false, reason: 'PROBE_FAILED' }
  }

  const probe: ProbeResult = {
    durationSeconds: duration,
    videoHeight: videoStream?.height ?? 0,
    videoWidth: videoStream?.width ?? 0,
    hasAudio: audioStream !== undefined,
    hasVideo: videoStream !== undefined,
    formatName: data.format?.format_name ?? '',
    codecName: videoStream?.codec_name ?? null,
  }

  return { ok: true, probe }
}
