import type { ContractVersion } from './contract.js'

export const API_CONTRACT_PATH = '/v1/transcriptions'

export interface ApiSubmitResponse {
  jobId: string
  contractVersion: ContractVersion
}

export interface ApiResponseError {
  error: string
}
