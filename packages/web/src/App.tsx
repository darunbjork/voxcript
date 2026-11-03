import { useCallback, useEffect, useState } from 'react'
import type { JobStatus } from '@transcribe/shared'

const API = import.meta.env.VITE_API_URL ?? 'https://api.voxcript.app'
const STORAGE_ID = 'voxcript_id'
const STORAGE_TOKEN = 'voxcript_token'

interface JobView {
  id: string
  status: JobStatus
  displayName: string
  failure: { code: string; correlationId: string } | null
}

export function App() {
  const [job, setJob] = useState<JobView | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const poll = useCallback(async (id: string, accessToken: string) => {
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${API}/api/v1/jobs/${id}`, {
        headers: { 'x-access-token': accessToken },
      })
      const json = (await res.json()) as {
        success: boolean
        data: JobView | null
        error: { message: string } | null
      }
      if (!json.success || json.data === null) {
        setError(json.error?.message ?? 'poll failed')
        return
      }
      setJob(json.data)
      if (
        json.data.status === 'done' ||
        json.data.status === 'failed' ||
        json.data.status === 'cancelled'
      ) {
        return
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    setError('timed out waiting for job')
  }, [])

  useEffect(() => {
    const storedId = sessionStorage.getItem(STORAGE_ID)
    const storedToken = sessionStorage.getItem(STORAGE_TOKEN)
    if (storedId !== null && storedToken !== null) {
      setToken(storedToken)
      void poll(storedId, storedToken)
    }
  }, [poll])

  const onFile = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      setJob(null)
      setToken(null)
      sessionStorage.removeItem(STORAGE_ID)
      sessionStorage.removeItem(STORAGE_TOKEN)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`${API}/api/v1/jobs`, {
          method: 'POST',
          body: form,
        })
        const json = (await res.json()) as {
          success: boolean
          data: { id: string; accessToken: string } | null
          error: { message: string } | null
        }
        if (!json.success || json.data === null) {
          setError(json.error?.message ?? 'upload failed')
          return
        }
        sessionStorage.setItem(STORAGE_ID, json.data.id)
        sessionStorage.setItem(STORAGE_TOKEN, json.data.accessToken)
        setToken(json.data.accessToken)
        await poll(json.data.id, json.data.accessToken)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'network error')
      } finally {
        setBusy(false)
      }
    },
    [poll],
  )

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Voxcript</h1>
      <p>Upload a short video. Receive an SRT subtitle file.</p>
      <input
        type="file"
        accept="video/*,.mp4,.mov,.webm,.mkv"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
        }}
      />
      {busy && <p>Working…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {job && (
        <div>
          <p>
            Status: <strong>{job.status}</strong>
          </p>
          {job.failure && <p>Failure: {job.failure.code}</p>}
          {job.status === 'done' && token && (
            <a
              href={`${API}/api/v1/jobs/${job.id}/srt?accessToken=${token}`}
              download={`${job.id}.srt`}
            >
              Download SRT
            </a>
          )}
        </div>
      )}
    </div>
  )
}
