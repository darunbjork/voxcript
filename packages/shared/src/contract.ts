export const CONTRACT_VERSION = '0.1.0' as const

export type ContractVersion = typeof CONTRACT_VERSION

export type MediaKind = 'audio' | 'video'

export const MEDIA_KINDS = ['audio', 'video'] as const satisfies readonly MediaKind[]

export interface SubmitTranscriptionRequest {
  mediaUrl: string
  mediaKind: MediaKind
}

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === 'string' && (MEDIA_KINDS as readonly string[]).includes(value)
}
