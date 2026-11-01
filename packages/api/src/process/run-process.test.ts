import { describe, expect, it } from 'vitest'
import { runProcess } from './run-process.js'

const node = process.execPath

describe('runProcess', () => {
  it('returns ok with stdout on success', async () => {
    const result = await runProcess({
      command: node,
      args: ['-e', "process.stdout.write('hi')"],
      timeoutMs: 5_000,
    })
    expect(result).toMatchObject({ ok: true, stdout: 'hi' })
  })

  it('reports NON_ZERO_EXIT with exit code and stderr tail', async () => {
    const result = await runProcess({
      command: node,
      args: ['-e', "process.stderr.write('boom'); process.exit(3)"],
      timeoutMs: 5_000,
    })
    expect(result).toMatchObject({
      ok: false,
      kind: 'NON_ZERO_EXIT',
      exitCode: 3,
      stderrTail: 'boom',
    })
  })

  it('reports SPAWN_FAILED for a missing binary', async () => {
    const result = await runProcess({
      command: 'definitely-not-a-binary',
      args: [],
      timeoutMs: 5_000,
    })
    expect(result).toMatchObject({ ok: false, kind: 'SPAWN_FAILED' })
  })

  it('kills a hung process on timeout', async () => {
    const result = await runProcess({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      timeoutMs: 300,
    })
    expect(result).toMatchObject({ ok: false, kind: 'TIMED_OUT' })
    expect(result.durationMs).toBeLessThan(3_000)
  })

  it('stops a process when the abort signal fires', async () => {
    const controller = new AbortController()
    const pending = runProcess({
      command: node,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      timeoutMs: 10_000,
      signal: controller.signal,
    })
    setTimeout(() => {
      controller.abort()
    }, 200)
    expect(await pending).toMatchObject({ ok: false, kind: 'ABORTED' })
  })

  it('kills a process that exceeds the stdout ceiling', async () => {
    const result = await runProcess({
      command: node,
      args: ['-e', "setInterval(() => process.stdout.write('x'.repeat(1000)), 5)"],
      timeoutMs: 10_000,
      maxStdoutBytes: 4_000,
    })
    expect(result).toMatchObject({ ok: false, kind: 'OUTPUT_TOO_LARGE' })
  })

  it('counts the ceiling in bytes not characters', async () => {
    const result = await runProcess({
      command: node,
      args: ['-e', "setInterval(() => process.stdout.write('å'.repeat(1000)), 5)"],
      timeoutMs: 10_000,
      maxStdoutBytes: 4_000,
    })
    expect(result).toMatchObject({ ok: false, kind: 'OUTPUT_TOO_LARGE' })
  })
})
