import { join } from 'node:path'
import { runProcess } from '../process/run-process.js'
import type { RunProcessFailure } from '../process/run-process.js'

export type TranscribeResult =
  { ok: true; srtPath: string } | { ok: false; failure: RunProcessFailure }

export async function transcribe(
  wavPath: string,
  outputDir: string,
  language: string,
  timeoutMs: number,
): Promise<TranscribeResult> {
  const whisperBin = process.env.WHISPER_BIN ?? '/usr/local/bin/whisper'
  const model = process.env.WHISPER_MODEL ?? '/opt/whisper/ggml-tiny.bin'
  const outputBase = join(outputDir, 'result')

  const result = await runProcess({
    command: whisperBin,
    args: [
      '-m',
      model,
      '-f',
      wavPath,
      '-l',
      language === 'auto' ? 'auto' : language,
      '-t',
      '2',
      '-osrt',
      '-of',
      outputBase,
    ],
    timeoutMs,
  })

  if (!result.ok) {
    return { ok: false, failure: result }
  }

  return { ok: true, srtPath: `${outputBase}.srt` }
}
