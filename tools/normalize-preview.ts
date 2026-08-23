import process from 'node:process'
import { normalizePreviewArtifact } from './generate-preview'

const filePath = process.argv[2]
if (!filePath || !normalizePreviewArtifact(filePath)) {
  process.exitCode = 1
}
