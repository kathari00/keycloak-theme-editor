/**
 * A minimal unified-diff applier. Structural template edits (reordered blocks,
 * new FreeMarker `<#assign>`s, wrapped conditionals) don't fit a "find this
 * selector, add this attribute" rule the way theme.properties does, so those
 * adaptations are stored as real `.patch` files (see `patches/`) instead.
 *
 * Deliberately not shelling out to `git apply`/`patch`: this needs to run
 * identically in CI and on every contributor's machine without depending on
 * which patch tool (or version of it) happens to be on PATH.
 */

interface Hunk {
  oldStart: number
  lines: string[]
}

function parseHunks(patchText: string): Hunk[] {
  const lines = patchText.replace(/\r\n/g, '\n').split('\n')
  const hunks: Hunk[] = []
  let i = 0
  while (i < lines.length && !lines[i].startsWith('@@')) {
    i++
  }

  while (i < lines.length) {
    const header = lines[i]
    const match = header.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/)
    if (!match) {
      i++
      continue
    }
    i++

    const hunkLines: string[] = []
    while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git') && lines[i] !== '') {
      if (lines[i] !== '\\ No newline at end of file') {
        hunkLines.push(lines[i])
      }
      i++
    }
    hunks.push({ oldStart: Number(match[1]), lines: hunkLines })
  }

  return hunks
}

/**
 * Applies a unified diff (as produced by `git diff --no-index`) to `sourceText`.
 * Throws with a precise line number and expected/actual content the moment a
 * context or delete line fails to match - the signal that upstream changed
 * something this adaptation depends on and a human needs to re-derive the patch.
 */
export function applyUnifiedDiff(sourceText: string, patchText: string, label = 'source'): string {
  const hunks = parseHunks(patchText)
  const src = sourceText.replace(/\r\n/g, '\n').split('\n')
  let cursor = 0
  const result: string[] = []

  for (const hunk of hunks) {
    const startIdx = hunk.oldStart - 1
    while (cursor < startIdx) {
      result.push(src[cursor])
      cursor++
    }

    for (const line of hunk.lines) {
      const tag = line[0]
      const content = line.slice(1)

      if (tag === ' ' || tag === '-') {
        if (src[cursor] !== content) {
          throw new Error(
            `Patch no longer applies to ${label} at line ${cursor + 1}:\n`
            + `  expected: ${JSON.stringify(content)}\n`
            + `  actual:   ${JSON.stringify(src[cursor])}\n`
            + `Upstream likely changed this line - re-derive the patch against the new source.`,
          )
        }
        if (tag === ' ') {
          result.push(src[cursor])
        }
        cursor++
      }
      else if (tag === '+') {
        result.push(content)
      }
    }
  }

  while (cursor < src.length) {
    result.push(src[cursor])
    cursor++
  }

  return result.join('\n')
}
