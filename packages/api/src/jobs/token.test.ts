import { describe, expect, it } from 'vitest'
import { generateAccessToken, generateJobId, hashToken } from './token.js'

describe('token helpers', () => {
  it('generates a 64-char hex access token', () => {
    const token = generateAccessToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a 32-char hex job id', () => {
    const id = generateJobId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })

  it('hashes deterministically', () => {
    const token = 'abc'
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toBe(hashToken('abd'))
  })
})
