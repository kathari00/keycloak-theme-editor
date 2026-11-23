/**
 * Branch coverage of the preview states: which `<#if>` / `<#elseif>` / `<#else>`
 * branches of the login templates no mock or state renders.
 *
 * Copies the templates the renderer reads, records every branch it takes in a
 * FreeMarker global, renders all pages and states with the real renderer, and
 * reads the recorded branches back from the output.
 *
 * Usage: npx tsx tools/preview-coverage.ts [--json=<file>]
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { resolveContextMocks } from './generate-preview'

const COVERAGE_GLOBAL = '__kcCov'

function print(line = '') {
  process.stdout.write(`${line}
`)
}
const REPORT_PATTERN = /<!--KCCOV:([^>]*)-->/g

export interface Branch {
  id: string
  file: string
  line: number
  kind: 'if' | 'elseif' | 'else' | 'implicit-else'
  condition: string
}

/**
 * Branches page states can't reach: they depend on theme properties or the
 * editor's own settings, or on sections template.ftl never renders.
 */
const OUT_OF_SCOPE: Array<{ reason: string, matches: (branch: Branch) => boolean }> = [
  { reason: 'theme properties and resources', matches: b => /themeResources|properties\.(?:meta|scripts|styles)|^not \(scripts\?\?\)$/.test(b.condition) || b.file.endsWith('/theme-resources.ftl') },
  { reason: 'editor settings', matches: b => /kteColorMode|imprintUrl|dataProtectionUrl|hasLegalLinks|hasLanguageSelector|_hasInfo/.test(b.condition) },
  { reason: 'sections template.ftl never renders', matches: b => /section = "title"/.test(b.condition) },
  { reason: 'info section only renders when registration is enabled', matches: b => /registrationDisabled/.test(b.condition) && b.kind === 'implicit-else' },
]

function outOfScopeReason(branch: Branch): string | undefined {
  return OUT_OF_SCOPE.find(rule => rule.matches(branch))?.reason
}

interface OpenBlock {
  type: 'if' | 'list' | 'switch'
  ifId?: string
  condition?: string
  hasElse?: boolean
}

/** End index (exclusive) of a directive whose expression starts at `from`, skipping quotes and parentheses. */
function directiveEnd(text: string, from: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = from; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      if (c === '\\')
        i++
      else if (c === quote)
        quote = null
      continue
    }
    if (c === '"' || c === '\'')
      quote = c
    else if (c === '(' || c === '[' || c === '{')
      depth++
    else if (c === ')' || c === ']' || c === '}')
      depth--
    else if (c === '>' && depth <= 0)
      return i + 1
  }
  throw new Error(`Unterminated directive at ${from}`)
}

function lineAt(text: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n')
      line++
  }
  return line
}

function record(id: string): string {
  return `<#global ${COVERAGE_GLOBAL}=(${COVERAGE_GLOBAL}!"")+"${id};">`
}

const TAG = /<#--[\s\S]*?-->|<#(if|elseif|list|switch)\b|<#else\s*>|<\/#(if|list|switch)\s*>/g

/** Adds a coverage record to every branch of every `<#if>` in `source`. */
export function instrument(source: string, file: string): { text: string, branches: Branch[] } {
  const branches: Branch[] = []
  const stack: OpenBlock[] = []
  let out = ''
  let cursor = 0
  TAG.lastIndex = 0

  for (let match = TAG.exec(source); match; match = TAG.exec(source)) {
    const start = match.index
    const token = match[0]
    if (token.startsWith('<#--'))
      continue

    const opening = match[1]
    const closing = match[2]
    const line = lineAt(source, start)

    if (opening === 'if' || opening === 'elseif') {
      const end = directiveEnd(source, start + 2 + opening.length)
      const condition = source.slice(start + 2 + opening.length, end - 1).trim()
      const id = `${file}:${line}:${opening}`
      out += source.slice(cursor, end) + record(id)
      cursor = end
      TAG.lastIndex = end
      branches.push({ id, file, line, kind: opening, condition })
      if (opening === 'if')
        stack.push({ type: 'if', ifId: id, condition })
      continue
    }
    if (opening === 'list' || opening === 'switch') {
      stack.push({ type: opening })
      continue
    }
    if (token.startsWith('<#else')) {
      const top = stack.at(-1)
      if (top?.type === 'if') {
        const id = `${file}:${line}:else`
        out += source.slice(cursor, start + token.length) + record(id)
        cursor = start + token.length
        top.hasElse = true
        branches.push({ id, file, line, kind: 'else', condition: `not (${top.condition})` })
      }
      continue
    }
    if (closing) {
      const top = stack.pop()
      if (top?.type !== closing)
        throw new Error(`${file}:${line}: </#${closing}> closes ${top?.type ?? 'nothing'}`)
      if (top.type === 'if' && !top.hasElse) {
        const id = `${top.ifId}:implicit-else`
        out += `${source.slice(cursor, start)}<#else>${record(id)}`
        cursor = start
        branches.push({ id, file, line: Number(top.ifId!.split(':').at(-2)), kind: 'implicit-else', condition: `not (${top.condition})` })
      }
    }
  }
  if (stack.length > 0)
    throw new Error(`${file}: ${stack.length} unclosed block(s)`)
  return { text: out + source.slice(cursor), branches }
}

/** Page templates render a whole document; they get the report appended. */
function isPageTemplate(source: string, name: string): boolean {
  return name !== 'template.ftl' && /@layout\.|<html/i.test(source)
}

function copyInstrumented(sourceRoot: string, targetRoot: string, label: string, branches: Branch[]) {
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile())
      continue
    const from = path.join(entry.parentPath, entry.name)
    const relative = path.relative(sourceRoot, from)
    const to = path.join(targetRoot, relative)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    if (!entry.name.endsWith('.ftl') || !relative.split(path.sep).includes('login')) {
      fs.copyFileSync(from, to)
      continue
    }
    const file = `${label}/${relative.split(path.sep).join('/')}`
    const instrumented = instrument(fs.readFileSync(from, 'utf8'), file)
    branches.push(...instrumented.branches)
    const text = isPageTemplate(instrumented.text, entry.name)
      ? `${instrumented.text}\n<!--KCCOV:\${${COVERAGE_GLOBAL}!""}-->`
      : instrumented.text
    fs.writeFileSync(to, text)
  }
}

function main() {
  const packageRoot = process.cwd()
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'kc-preview-coverage-'))
  const branches: Branch[] = []
  const input = path.join(work, 'upstream')
  const overrides = path.join(work, 'overrides')
  copyInstrumented(path.join(packageRoot, 'public', 'keycloak-upstream'), input, 'upstream', branches)
  copyInstrumented(path.join(packageRoot, 'public', 'keycloak-dev-resources', 'themes'), overrides, 'editor', branches)

  const mocksPath = path.join(work, 'mocks.json')
  const mocks = resolveContextMocks()
  fs.writeFileSync(mocksPath, JSON.stringify(mocks))
  const output = path.join(work, 'out')
  const jar = path.join(packageRoot, 'tools', 'preview-renderer', 'preview-renderer.jar')
  const run = spawnSync('java', ['-jar', jar, `--context-mocks=${mocksPath}`, `--input=${input}`, `--overrides=${overrides}`, `--presets=${overrides}`, `--output=${output}`], { encoding: 'utf8' })
  if (run.status !== 0) {
    process.stderr.write(run.stderr)
    throw new Error(`Renderer exited with ${run.status}`)
  }

  const pages = JSON.parse(fs.readFileSync(path.join(output, 'pages.json'), 'utf8')).variants as Record<string, Record<string, Record<string, string>>>
  const hits = new Map<string, Set<string>>()
  for (const [variant, variantPages] of Object.entries(pages)) {
    for (const [pageId, states] of Object.entries(variantPages)) {
      for (const [stateId, html] of Object.entries(states)) {
        for (const report of html.matchAll(REPORT_PATTERN)) {
          for (const id of report[1].split(';').filter(Boolean)) {
            if (!hits.has(id))
              hits.set(id, new Set())
            hits.get(id)!.add(`${variant}/${pageId}@${stateId}`)
          }
        }
      }
    }
  }

  // The editor's own copies (editor/<theme>/login/x.ftl) replace upstream/<theme>/login/x.ftl, which then never renders.
  const editorFiles = new Set(branches.filter(b => b.file.startsWith('editor/')).map(b => b.file.slice('editor/'.length)))
  const isShadowed = (file: string) => file.startsWith('upstream/') && editorFiles.has(file.slice('upstream/'.length))

  const byFile = new Map<string, Branch[]>()
  for (const branch of branches) {
    if (isShadowed(branch.file))
      continue
    if (!byFile.has(branch.file))
      byFile.set(branch.file, [])
    byFile.get(branch.file)!.push(branch)
  }

  let total = 0
  let covered = 0
  const rows: string[] = []
  const uncovered: Array<Branch & { covered: false }> = []
  const outOfScope = new Map<string, number>()
  for (const [file, allFileBranches] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    const fileBranches = allFileBranches.filter((branch) => {
      const reason = hits.has(branch.id) ? undefined : outOfScopeReason(branch)
      if (reason)
        outOfScope.set(reason, (outOfScope.get(reason) ?? 0) + 1)
      return !reason
    })
    const missing = fileBranches.filter(branch => !hits.has(branch.id))
    total += fileBranches.length
    covered += fileBranches.length - missing.length
    if (fileBranches.length > 0)
      rows.push(`${String(fileBranches.length - missing.length).padStart(4)}/${String(fileBranches.length).padEnd(4)} ${file}`)
    for (const branch of missing)
      uncovered.push({ ...branch, covered: false })
  }

  print(rows.join('\n'))
  print(`\n${covered}/${total} reachable branches covered (${Math.round(covered / total * 100)}%)`)
  for (const [reason, count] of outOfScope)
    print(`  not counted: ${count} branch(es), ${reason}`)
  if (process.argv.includes('--uncovered')) {
    print('\nUncovered:')
    for (const branch of uncovered)
      print(`  ${branch.file}:${branch.line} ${branch.kind} ${branch.condition.replace(/\s+/g, ' ')}`)
  }

  // States that failed to render: defined in the mocks but missing from a variant whose page rendered.
  const failedStates: string[] = []
  for (const key of Object.keys(mocks.pages).filter(key => key.includes('@'))) {
    const [template, stateId] = key.split('@')
    const pageId = template.replace(/\.ftl$/, '.html')
    for (const [variant, variantPages] of Object.entries(pages)) {
      if (variantPages[pageId] && !variantPages[pageId][stateId])
        failedStates.push(`${variant}/${template}@${stateId}`)
    }
  }
  if (failedStates.length > 0)
    print(`\n${failedStates.length} state(s) failed to render:\n${failedStates.map(state => `  ${state}`).join('\n')}`)
  if (process.argv.includes('--verbose'))
    process.stderr.write(run.stderr)

  const jsonArg = process.argv.find(arg => arg.startsWith('--json='))
  if (jsonArg)
    fs.writeFileSync(jsonArg.slice('--json='.length), `${JSON.stringify({ covered, total, uncovered }, null, 2)}\n`)
  fs.rmSync(work, { recursive: true, force: true })
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('tools/preview-coverage.ts')
if (isDirectRun)
  main()
