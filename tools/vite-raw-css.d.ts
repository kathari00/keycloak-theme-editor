// tsconfig.node.json has no reference to vite/client, but tools/build-theme-fixture.ts transitively
// reaches src/features/editor/lib/framework-bindings/bootstrap.ts through the shared export pipeline,
// which does a Vite-only `?raw` CSS import (never actually loaded at runtime for the 'native' path,
// see prepare-theme-export-files.ts) — this keeps that import typecheckable under this project too.
declare module '*.css?raw' {
  const src: string
  export default src
}
