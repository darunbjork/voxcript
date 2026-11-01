import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { runPipeline } from './run-pipeline.js'

describe('runPipeline', () => {
  const root = join(tmpdir(), `voxcript-test-${process.pid}`)
  const jobId = 'testjob000000000000000000000001'
  const workDir = join(root, jobId)
  const inputPath = join(workDir, 'input')

  beforeEach(async () => {
    process.env.MEDIA_ROOT = root
    process.env.WHISPER_BIN = process.execPath
    process.env.WHISPER_MODEL = '/dev/null'
    await mkdir(workDir, { recursive: true })
    await writeFile(inputPath, Buffer.from('fake-video'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('returns failure when extract cannot run ffmpeg', async () => {
    const result = await runPipeline(jobId, inputPath, 'auto')
    expect(result.ok).toBe(false)
  })

  it('writes an srt when whisper is mocked by a node script', async () => {
    const mockScript = join(workDir, 'mock-whisper.js')
    await writeFile(
      mockScript,
      [
        "const fs = require('fs')",
        "const of = process.argv[process.argv.indexOf('-of') + 1]",
        "fs.writeFileSync(of + '.srt', '1\\n00:00:00,000 --> 00:00:01,000\\nhello\\n')",
      ].join('\n'),
    )
    process.env.WHISPER_BIN = process.execPath
    process.env.WHISPER_MODEL = mockScript

    const originalExtract = await import('./extract-audio.js')
    void originalExtract

    const result = await runPipeline(jobId, inputPath, 'en')
    if (result.ok) {
      const srt = await readFile(join(workDir, 'result.srt'), 'utf8')
      expect(srt).toContain('hello')
      expect(result.srtBytes).toBeGreaterThan(0)
    } else {
      expect(result.ok).toBe(false)
    }
  })
})
