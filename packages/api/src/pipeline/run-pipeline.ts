import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { JobFailureCode } from '@transcribe/shared'
import { mapProcessFailure } from '../process/job-failure.js'
import { extractAudio } from './extract-audio.js'
import { transcribe } from './transcribe.js'

export type RunPipelineResult =
  { ok: true; srtBytes: number } | { ok: false; failureCode: JobFailureCode }

export async function runPipeline(
  jobId: string,
  inputPath: string,
  language: string,
): Promise<RunPipelineResult> {
  const mediaRoot = process.env.MEDIA_ROOT ?? '/tmp/voxcript'
  const workDir = join(mediaRoot, jobId)
  await mkdir(workDir, { recursive: true })

  const wavPath = join(workDir, 'audio.wav')

  const extracted = await extractAudio(inputPath, wavPath, 60_000)
  if (!extracted.ok) {
    return {
      ok: false,
      failureCode: mapProcessFailure('transcribe', extracted.failure),
    }
  }

  const transcribed = await transcribe(wavPath, workDir, language, 300_000)
  if (!transcribed.ok) {
    return {
      ok: false,
      failureCode: mapProcessFailure('transcribe', transcribed.failure),
    }
  }

  const info = await stat(transcribed.srtPath)
  return { ok: true, srtBytes: info.size }
}
