import type { UndoRedoAction } from '../stores/types'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { normalizeCss } from '../style-editor-utils'
import { userCssStore } from '../user-css-store'

interface UseStyleWorkspaceOptions {
  stylesCss: string
  selectedElement: Element | null
  hasActiveSelection: boolean
  showAllStyles: boolean
  addUndoRedoAction: (action: UndoRedoAction) => void
  setStylesCss: (css: string) => void
}

interface UseStyleWorkspaceResult {
  editorCss: string
  setEditorCss: (nextCss: string) => void
  commitEditorCss: () => void
}

interface StyleWorkspaceDraftState {
  editorCssDraft: string
  sourceEditorCss: string
}

type StyleWorkspaceDraftAction
  = { type: 'syncFromSource', sourceEditorCss: string }
    | { type: 'setDraft', editorCssDraft: string }

function createInitialDraftState(sourceEditorCss: string): StyleWorkspaceDraftState {
  return {
    editorCssDraft: sourceEditorCss,
    sourceEditorCss,
  }
}

function styleWorkspaceDraftReducer(
  state: StyleWorkspaceDraftState,
  action: StyleWorkspaceDraftAction,
): StyleWorkspaceDraftState {
  if (action.type === 'setDraft') {
    if (action.editorCssDraft === state.editorCssDraft) {
      return state
    }
    return { ...state, editorCssDraft: action.editorCssDraft }
  }

  if (action.sourceEditorCss === state.sourceEditorCss) {
    return state
  }

  return {
    sourceEditorCss: action.sourceEditorCss,
    editorCssDraft: action.sourceEditorCss,
  }
}

function shouldTreatAsRuleBlock(cssText: string): boolean {
  const trimmed = cssText.trim()
  if (!trimmed.includes('{') || !trimmed.includes('}')) {
    return false
  }

  let depth = 0
  for (const ch of trimmed) {
    if (ch === '{') {
      depth++
      continue
    }
    if (ch === '}') {
      depth--
      if (depth < 0) {
        return false
      }
    }
  }

  return depth === 0
}

/**
 * Strip any trailing text after the last top-level closing brace.
 *  This discards unfinished selectors that the user started typing
 *  but never completed with a `{ ... }` block.
 */
function stripTrailingIncompleteRule(cssText: string): string {
  const trimmed = cssText.trim()
  let depth = 0
  let lastTopLevelClose = -1

  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') {
      depth++
    }
    else if (trimmed[i] === '}') {
      depth--
      if (depth === 0) {
        lastTopLevelClose = i
      }
    }
  }

  if (lastTopLevelClose === -1) {
    return trimmed
  }

  const afterLastClose = trimmed.slice(lastTopLevelClose + 1).trim()
  if (!afterLastClose) {
    return trimmed
  }

  return trimmed.slice(0, lastTopLevelClose + 1).trim()
}

function getFirstRuleSelectorSignature(cssText: string): string {
  const trimmed = cssText.trim()
  if (!trimmed) {
    return ''
  }

  const firstBraceIndex = trimmed.indexOf('{')
  if (firstBraceIndex === -1) {
    return ''
  }

  return trimmed
    .slice(0, firstBraceIndex)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim()
}

interface CommitDraftContext {
  sourceCss: string
  sourceEditorCss: string
  cssDraftToCommit: string
  showAllStyles: boolean
  scopedElement: Element | null
}

function resolveCommittedCss(context: CommitDraftContext): string | null {
  const {
    sourceCss,
    sourceEditorCss,
    cssDraftToCommit,
    showAllStyles,
    scopedElement,
  } = context

  if (showAllStyles) {
    if (normalizeCss(cssDraftToCommit) === normalizeCss(sourceEditorCss)) {
      return null
    }
    return cssDraftToCommit
  }

  if (!scopedElement) {
    return null
  }

  const scopedInsertOptions = { insertPositionWhenMissing: 'start' as const }

  if (!cssDraftToCommit.trim()) {
    const nextCss = userCssStore.replaceCssForElementInText(sourceCss, scopedElement, '', scopedInsertOptions)
    return nextCss === sourceCss ? null : nextCss
  }

  if (!shouldTreatAsRuleBlock(cssDraftToCommit)) {
    return null
  }

  const cleanedDraft = stripTrailingIncompleteRule(cssDraftToCommit)
  if (!cleanedDraft.trim()) {
    return null
  }

  const nextCss = userCssStore.replaceCssForElementInText(sourceCss, scopedElement, cleanedDraft, scopedInsertOptions)

  return nextCss === sourceCss ? null : nextCss
}

export function useStyleWorkspace({
  stylesCss,
  selectedElement,
  hasActiveSelection,
  showAllStyles,
  addUndoRedoAction,
  setStylesCss,
}: UseStyleWorkspaceOptions): UseStyleWorkspaceResult {
  const sourceCss = stylesCss
  const lastSelfCommittedCssRef = useRef<string | null>(null)

  const applySourceCss = useCallback((nextCss: string) => {
    if (nextCss === sourceCss) {
      return
    }

    addUndoRedoAction({
      undo: () => {
        setStylesCss(sourceCss)
      },
      redo: () => {
        setStylesCss(nextCss)
      },
      coalesceKey: 'css-editor-user',
    })

    lastSelfCommittedCssRef.current = nextCss
    setStylesCss(nextCss)
  }, [addUndoRedoAction, setStylesCss, sourceCss])

  const effectiveScopedElement = hasActiveSelection ? selectedElement : null

  const sourceEditorCss = useMemo(() => {
    if (showAllStyles) {
      return sourceCss
    }
    if (!effectiveScopedElement) {
      return ''
    }
    return userCssStore.getCssForElementFromText(sourceCss, effectiveScopedElement)
  }, [showAllStyles, effectiveScopedElement, sourceCss])

  const [draftState, dispatchDraft] = useReducer(
    styleWorkspaceDraftReducer,
    sourceEditorCss,
    createInitialDraftState,
  )

  const previousContextRef = useRef({
    sourceEditorCss,
    showAllStyles,
    scopedElement: effectiveScopedElement,
  })

  useEffect(() => {
    const previousContext = previousContextRef.current
    const elementOrModeChanged
      = previousContext.showAllStyles !== showAllStyles
        || previousContext.scopedElement !== effectiveScopedElement
    const sourceChanged = previousContext.sourceEditorCss !== sourceEditorCss
    const contextChanged = elementOrModeChanged || sourceChanged

    if (contextChanged) {
      const isSelfEdit = !elementOrModeChanged
        && lastSelfCommittedCssRef.current !== null
        && sourceCss === lastSelfCommittedCssRef.current
      lastSelfCommittedCssRef.current = null

      if (!isSelfEdit) {
        const hasPendingDraft
          = normalizeCss(draftState.editorCssDraft) !== normalizeCss(previousContext.sourceEditorCss)

        if (hasPendingDraft) {
          const nextCss = resolveCommittedCss({
            sourceCss,
            sourceEditorCss: previousContext.sourceEditorCss,
            cssDraftToCommit: draftState.editorCssDraft,
            showAllStyles: previousContext.showAllStyles,
            scopedElement: previousContext.scopedElement,
          })

          if (nextCss && nextCss !== sourceCss) {
            applySourceCss(nextCss)
          }
        }

        dispatchDraft({ type: 'syncFromSource', sourceEditorCss })
      }
    }

    previousContextRef.current = {
      sourceEditorCss,
      showAllStyles,
      scopedElement: effectiveScopedElement,
    }
  }, [
    applySourceCss,
    draftState.editorCssDraft,
    effectiveScopedElement,
    showAllStyles,
    sourceCss,
    sourceEditorCss,
  ])

  const commitEditorCssDraft = useCallback((cssDraftToCommit: string) => {
    const nextCss = resolveCommittedCss({
      sourceCss,
      sourceEditorCss,
      cssDraftToCommit,
      showAllStyles,
      scopedElement: effectiveScopedElement,
    })
    if (!nextCss || nextCss === sourceCss) {
      return
    }
    applySourceCss(nextCss)
  }, [showAllStyles, effectiveScopedElement, applySourceCss, sourceCss, sourceEditorCss])

  const commitEditorCss = useCallback(() => {
    commitEditorCssDraft(draftState.editorCssDraft)
  }, [commitEditorCssDraft, draftState.editorCssDraft])

  const setEditorCss = useCallback((nextCss: string) => {
    dispatchDraft({ type: 'setDraft', editorCssDraft: nextCss })

    if (showAllStyles) {
      commitEditorCssDraft(nextCss)
      return
    }

    // Scoped edits should update preview immediately once the rule block is syntactically complete.
    if (!showAllStyles && shouldTreatAsRuleBlock(nextCss)) {
      const nextSelectorSignature = getFirstRuleSelectorSignature(nextCss)
      const sourceSelectorSignature = getFirstRuleSelectorSignature(sourceEditorCss)
      const selectorIsUnchanged = Boolean(nextSelectorSignature) && nextSelectorSignature === sourceSelectorSignature
      const selectorStillTargetsSelectedElement = effectiveScopedElement !== null
        && userCssStore.doesCssTargetElement(nextCss, effectiveScopedElement)

      // Live-commit declaration edits and selector edits that still target the selected element.
      // Unrelated selector edits still commit on blur to avoid scope loss while typing.
      if (selectorIsUnchanged || selectorStillTargetsSelectedElement) {
        commitEditorCssDraft(nextCss)
        return
      }
    }

    // Apply deletions immediately when a rule is fully removed.
    if (!nextCss.trim() && sourceEditorCss.trim()) {
      commitEditorCssDraft(nextCss)
    }
  }, [commitEditorCssDraft, effectiveScopedElement, showAllStyles, sourceEditorCss])

  return {
    editorCss: draftState.editorCssDraft,
    setEditorCss,
    commitEditorCss,
  }
}
