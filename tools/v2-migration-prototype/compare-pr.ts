import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

interface Output { variants: Record<string, Record<string, Record<string, string>>> }

const root = path.dirname(fileURLToPath(import.meta.url))
const defaultPages = ['login.html', 'login-username.html', 'login-password.html', 'register.html']

function signature(html: string) {
  const document = new JSDOM(html).window.document
  const entries = [...document.querySelectorAll('form, input, textarea, select, button, a, script[src]')]
  const controls = entries.map((element) => {
    const keys = ['id', 'name', 'type', 'action', 'method', 'href', 'src', 'value', 'autocomplete', 'tabindex', 'aria-invalid', 'aria-describedby', 'required', 'checked', 'novalidate', 'onsubmit', 'class', 'role', 'style', 'hidden']
    const attrs = keys.filter(key => element.hasAttribute(key)).map((key) => {
      const value = key === 'class' ? [...element.classList].sort().join(' ') : element.getAttribute(key)
      return `${key}=${value}`
    }).join(' ')
    return `${element.tagName.toLowerCase()} ${attrs}`.trim()
  })
  const scripts = [...document.querySelectorAll('script:not([src])')].map((script) => {
    const code = script.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    return `inline-script ${createHash('sha256').update(code).digest('hex')}`
  })
  const bodyText = document.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  return [...controls, ...scripts, `body-text ${createHash('sha256').update(bodyText).digest('hex')}`]
}

async function main() {
  const beforePath = process.argv[2] ?? path.join(root, 'generated/pr-original-pages.json')
  const afterPath = process.argv[3] ?? path.join(root, 'generated/pr-candidate-pages.json')
  const selectedPages = process.argv.find(arg => arg.startsWith('--pages='))
  const before = JSON.parse(await readFile(beforePath, 'utf8')) as Output
  const after = JSON.parse(await readFile(afterPath, 'utf8')) as Output
  const pages = selectedPages
    ? selectedPages === '--pages=all'
      ? Object.keys(before.variants.v2)
      : selectedPages.slice('--pages='.length).split(',')
    : defaultPages
  let differences = 0
  for (const page of pages) {
    const beforeStates = before.variants.v2[page]
    const afterStates = after.variants.v2[page]
    if (!afterStates) {
      differences++
      process.stdout.write(`${page}: missing candidate page\n`)
      continue
    }
    for (const state of Object.keys(beforeStates)) {
      if (!afterStates[state]) {
        differences++
        process.stdout.write(`${page} / ${state}: missing candidate state\n`)
        continue
      }
      const oldEntries = signature(beforeStates[state])
      const newEntries = signature(afterStates[state])
      const remaining = [...newEntries]
      const removed = oldEntries.filter((entry) => {
        const index = remaining.indexOf(entry)
        if (index < 0)
          return true
        remaining.splice(index, 1)
        return false
      })
      const added = remaining
      if (removed.length || added.length) {
        differences++
        process.stdout.write(`${page} / ${state}\n`)
        for (const entry of removed) process.stdout.write(`  - ${entry}\n`)
        for (const entry of added) process.stdout.write(`  + ${entry}\n`)
      }
    }
  }
  process.stdout.write(`States with control/attribute differences: ${differences}\n`)
  if (differences > 0)
    process.exitCode = 1
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
