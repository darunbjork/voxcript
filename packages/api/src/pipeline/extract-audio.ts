import { runProcess } from '../process/run-process.js'
import type { RunProcessFailure } from '../process/run-process.js'

export type ExtractAudioResult = { ok: true } | { ok: false; failure: RunProcessFailure }

export async function extractAudio(
  inputPath: string,
  outputPath: string,
  timeoutMs: number,
): Promise<ExtractAudioResult> {
  const result = await runProcess({
    command: 'ffmpeg',
    args: [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-protocol_whitelist',
      'file',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'pcm_s16le',
      '-t',
      '61',
      outputPath,
    ],
    timeoutMs,
  })

  if (!result.ok) {
    return { ok: false, failure: result }
  }
  return { ok: true }
}
