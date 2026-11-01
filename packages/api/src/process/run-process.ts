import { spawn } from 'node:child_process'

export type ProcessFailureKind =
  | 'SPAWN_FAILED'
  | 'NON_ZERO_EXIT'
  | 'SIGNALED'
  | 'TIMED_OUT'
  | 'ABORTED'
  | 'OUTPUT_TOO_LARGE'

export interface RunProcessOptions {
  command: string
  args: readonly string[]
  timeoutMs: number
  cwd?: string
  signal?: AbortSignal
  maxStdoutBytes?: number
  stderrTailBytes?: number
}

export interface RunProcessSuccess {
  ok: true
  stdout: string
  stderrTail: string
  durationMs: number
}

export interface RunProcessFailure {
  ok: false
  kind: ProcessFailureKind
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderrTail: string
  durationMs: number
}

export type RunProcessResult = RunProcessSuccess | RunProcessFailure

const DEFAULT_MAX_STDOUT_BYTES = 1_048_576
const DEFAULT_STDERR_TAIL_BYTES = 8_192

export function runProcess(options: RunProcessOptions): Promise<RunProcessResult> {
  return new Promise<RunProcessResult>((resolve) => {
    const startedAt = Date.now()
    const maxStdout = options.maxStdoutBytes ?? DEFAULT_MAX_STDOUT_BYTES
    const tailLimit = options.stderrTailBytes ?? DEFAULT_STDERR_TAIL_BYTES

    let stdout = ''
    let stdoutBytes = 0
    let stderrTail = ''
    let timedOut = false
    let aborted = false
    let outputTooLarge = false
    let settled = false

    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      shell: false,
    })

    const killTree = (): void => {
      const pid = child.pid
      if (pid === undefined) return
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        return
      }
    }

    const timer = setTimeout(() => {
      timedOut = true
      killTree()
    }, options.timeoutMs)

    const onAbort = (): void => {
      aborted = true
      killTree()
    }

    const finish = (result: RunProcessResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', onAbort)
      resolve(result)
    }

    const fail = (
      kind: ProcessFailureKind,
      exitCode: number | null,
      signal: NodeJS.Signals | null,
    ): void => {
      finish({
        ok: false,
        kind,
        exitCode,
        signal,
        stdout,
        stderrTail,
        durationMs: Date.now() - startedAt,
      })
    }

    if (options.signal?.aborted === true) {
      onAbort()
    } else {
      options.signal?.addEventListener('abort', onAbort, { once: true })
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      const chunkBytes = Buffer.byteLength(chunk, 'utf8')
      if (stdoutBytes + chunkBytes > maxStdout) {
        outputTooLarge = true
        killTree()
        return
      }
      stdoutBytes += chunkBytes
      stdout += chunk
    })

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-tailLimit)
    })

    child.on('error', (error: Error) => {
      stderrTail = error.message
      fail('SPAWN_FAILED', null, null)
    })

    child.on('close', (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      if (timedOut) fail('TIMED_OUT', exitCode, signal)
      else if (aborted) fail('ABORTED', exitCode, signal)
      else if (outputTooLarge) fail('OUTPUT_TOO_LARGE', exitCode, signal)
      else if (signal !== null) fail('SIGNALED', exitCode, signal)
      else if (exitCode !== 0) fail('NON_ZERO_EXIT', exitCode, signal)
      else
        finish({
          ok: true,
          stdout,
          stderrTail,
          durationMs: Date.now() - startedAt,
        })
    })
  })
}
