import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

test('upload video and download srt end-to-end', async ({ page }) => {
  await page.goto('/')

  const fixturePath = fileURLToPath(
    new URL('../test-fixtures/speech.mp4', import.meta.url),
  )
  await page.setInputFiles('input[type="file"]', fixturePath)

  await expect(page.getByText('Status:', { exact: false })).toBeVisible()
  await expect(page.getByText('done', { exact: false })).toBeVisible({
    timeout: 90_000,
  })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download SRT' }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  if (downloadPath === null) {
    throw new Error('download path missing')
  }

  const srtContent = await readFile(downloadPath, 'utf8')
  expect(srtContent.length).toBeGreaterThan(20)
  expect(srtContent).toContain('-->')
  expect(srtContent).not.toContain('[placeholder]')
})
