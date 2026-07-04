import type { Frame, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function getPreviewFrame(page: Page): Promise<Frame> {
  const frameHandle = await page.locator('iframe').elementHandle()
  const frame = await frameHandle?.contentFrame()
  expect(frame).toBeTruthy()
  await expect(frame!.locator('body')).toHaveAttribute('data-page-id', /login-/)
  return frame!
}

export async function expectPreviewStyleToContain(frame: Frame, selector: string, text: string) {
  await expect.poll(async () => {
    return await frame.locator(selector).evaluate(element => element.textContent || '')
  }).toContain(text)
}
