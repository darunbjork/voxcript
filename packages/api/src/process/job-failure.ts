import type { JobFailureCode } from '@transcribe/shared'
import type { RunProcessFailure } from './run-process.js'

export type PipelineStage = 'transcribe' | 'encode'

export function mapProcessFailure(
  stage: PipelineStage,
  failure: RunProcessFailure,
): JobFailureCode {
  const stageFailure: JobFailureCode =
    stage === 'transcribe' ? 'TRANSCRIPTION_FAILED' : 'ENCODING_FAILED'

  switch (failure.kind) {
    case 'TIMED_OUT':
      return 'TIMED_OUT'
    case 'ABORTED':
      return 'CANCELLED'
    case 'SIGNALED':
      return failure.signal === 'SIGKILL' ? 'OUT_OF_MEMORY' : stageFailure
    case 'SPAWN_FAILED':
      return 'INTERNAL'
    case 'OUTPUT_TOO_LARGE':
    case 'NON_ZERO_EXIT':
      return stageFailure
  }
}
