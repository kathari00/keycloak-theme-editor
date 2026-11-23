/**
 * The rendered preview pages are build output and not committed. Generates
 * them (base language only) before dev, build or tests when they're missing.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { generatePreview } from './generate-preview'

const packageRoot = process.cwd()
const pagesJson = path.join(packageRoot, 'src', 'features', 'preview', 'generated', 'pages.json')

async function main() {
  if (fs.existsSync(pagesJson))
    return
  if (!fs.existsSync(path.join(packageRoot, 'public', 'keycloak-upstream'))) {
    process.stderr.write('The preview pages need the Keycloak templates. Run `npm run sync:keycloak`, then try again.\n')
    process.exitCode = 1
    return
  }
  const jarPath = path.join(packageRoot, 'tools', 'preview-renderer', 'preview-renderer.jar')
  const result = await generatePreview({ packageRoot, jarPath: fs.existsSync(jarPath) ? jarPath : undefined })
  if (!result.success)
    process.exitCode = 1
}

void main()
