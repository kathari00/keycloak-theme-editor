import type { LocalizedContentOverrides } from '../../stores/types'
import {
  Button,
  ExpandableSection,
  Flex,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  TextInput,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import { useEffect, useState } from 'react'
import {
  CURATED_LOCALES,
  DEFAULT_LOCALE_TAG,
  localeNativeName,
} from '../../../i18n/locale-catalog'
import { usePreviewRuntime } from '../../../preview/hooks/use-preview-context'
import { annotatePreviewMessageKeys, applyPreviewMessageValue, findPreviewMessageElement, getCatalogMessage } from '../../../preview/lib/preview-message-catalog'
import { getVariantMessageUsagePages } from '../../../preview/load-generated'
import { editorActions } from '../../actions'

interface LanguagesPanelProps {
  enabledLocales: string[]
  quickStartContentByLocale: Partial<Record<string, LocalizedContentOverrides>>
  infoMessage: string
  imprintLabel: string
  dataProtectionLabel: string
}

const formGroupStyle = { marginBottom: 0 }

const SELECTABLE_LOCALES = CURATED_LOCALES.filter(locale => locale.tag !== DEFAULT_LOCALE_TAG)

function localeOptionLabel(tag: string, englishLabel: string): string {
  const native = localeNativeName(tag)
  return native.toLowerCase() === englishLabel.toLowerCase()
    ? `${englishLabel} (${tag})`
    : `${englishLabel} - ${native} (${tag})`
}

export function LanguagesPanel({
  enabledLocales,
  quickStartContentByLocale,
  infoMessage,
  imprintLabel,
  dataProtectionLabel,
}: LanguagesPanelProps) {
  const [editingLocale, setEditingLocale] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<{
    key: string
    defaultTranslation: string
    pageIds: string[]
  } | null>(null)
  const { activeVariantId, selectedNodeId, iframeRef, previewReady, setActivePage } = usePreviewRuntime()

  const availableLocales = SELECTABLE_LOCALES.filter(locale => !enabledLocales.includes(locale.tag))
  const activeLocale = enabledLocales.includes(editingLocale) ? editingLocale : enabledLocales[0] ?? ''
  const activeOverrides = activeLocale ? quickStartContentByLocale[activeLocale] ?? {} : {}

  useEffect(() => {
    let cancelled = false
    setSelectedMessage(null)
    const resolveSelectedMessage = async () => {
      const doc = iframeRef.current?.contentDocument
      if (!doc || !selectedNodeId || !activeLocale) {
        setSelectedMessage(null)
        return
      }

      await annotatePreviewMessageKeys(doc, doc.documentElement.lang || DEFAULT_LOCALE_TAG)
      const selected = doc.querySelector(selectedNodeId)
      const messageElement = findPreviewMessageElement(selected)
      const key = messageElement?.dataset.kcI18nKey
      if (!key) {
        if (!cancelled)
          setSelectedMessage(null)
        return
      }

      const customDefaults: Record<string, string> = { infoMessage, imprintLabel, dataProtectionLabel }
      const defaultTranslation = customDefaults[key] ?? await getCatalogMessage(activeLocale, key)
      const pageIds = getVariantMessageUsagePages({
        variantId: activeVariantId,
        localeTag: activeLocale,
        messageText: defaultTranslation,
      })
      if (!cancelled) {
        setSelectedMessage({ key, defaultTranslation, pageIds })
      }
    }

    void resolveSelectedMessage()
    return () => {
      cancelled = true
    }
  }, [activeLocale, activeVariantId, dataProtectionLabel, iframeRef, imprintLabel, infoMessage, previewReady, selectedNodeId])

  const addLocale = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    if (!value) {
      return
    }
    editorActions.setEnabledLocales([...enabledLocales, value])
    editorActions.setPreviewLocaleTag(value)
    setEditingLocale(value)
  }

  const removeLocale = (tag: string) => {
    editorActions.setEnabledLocales(enabledLocales.filter(locale => locale !== tag))
  }

  const updateSelectedOverride = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    if (!activeLocale || !selectedMessage) {
      return
    }
    editorActions.setLocalizedContent(activeLocale, { [selectedMessage.key]: value })
    const doc = iframeRef.current?.contentDocument
    if (doc) {
      applyPreviewMessageValue(doc, selectedMessage.key, value.trim() || selectedMessage.defaultTranslation)
    }
  }

  return (
    <Stack hasGutter>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <Title headingLevel="h3" size="md">
          Languages
        </Title>
        <Tooltip content="Adds translations to the exported theme. Whether users actually see a language switcher is decided by your Keycloak realm's internationalization settings, not by the theme.">
          <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
        </Tooltip>
      </Flex>

      <StackItem>
        <FormGroup label="Add a language" fieldId="quick-start-add-locale" style={formGroupStyle}>
          <FormSelect
            id="quick-start-add-locale"
            value=""
            onChange={addLocale}
            aria-label="Add a language"
          >
            <FormSelectOption
              value=""
              label={availableLocales.length > 0 ? 'Select a language...' : 'All languages added'}
              isDisabled
            />
            {availableLocales.map(locale => (
              <FormSelectOption
                key={locale.tag}
                value={locale.tag}
                label={localeOptionLabel(locale.tag, locale.englishLabel)}
              />
            ))}
          </FormSelect>
        </FormGroup>
      </StackItem>

      {enabledLocales.length > 0 && (
        <StackItem>
          <LabelGroup categoryName="Enabled">
            {enabledLocales.map(tag => (
              <Label key={tag} onClose={() => removeLocale(tag)} closeBtnAriaLabel={`Remove ${tag}`}>
                {localeNativeName(tag)}
              </Label>
            ))}
          </LabelGroup>
        </StackItem>
      )}

      {enabledLocales.length === 0
        ? (
            <StackItem>
              <small style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                The theme is exported in English only. Add a language to translate your own texts;
                Keycloak already translates everything else.
              </small>
            </StackItem>
          )
        : (
            <>
              <StackItem>
                <FormGroup label="Translate" fieldId="quick-start-locale-editor" style={formGroupStyle}>
                  <FormSelect
                    id="quick-start-locale-editor"
                    value={activeLocale}
                    onChange={(_event, value) => {
                      setEditingLocale(value)
                      editorActions.setPreviewLocaleTag(value)
                    }}
                    aria-label="Language to translate"
                  >
                    {enabledLocales.map(tag => (
                      <FormSelectOption key={tag} value={tag} label={localeNativeName(tag)} />
                    ))}
                  </FormSelect>
                </FormGroup>
              </StackItem>

              <StackItem>
                <small style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                  Anything left blank falls back to the English text.
                </small>
              </StackItem>

              <StackItem>
                <Title headingLevel="h4" size="md">Selected element</Title>
              </StackItem>
              {selectedMessage
                ? (
                    <StackItem>
                      <FormGroup
                        label={`Translate ${selectedMessage.key}`}
                        fieldId="selected-element-translation"
                        style={formGroupStyle}
                      >
                        <TextInput
                          key={`${activeLocale}:${selectedMessage.key}`}
                          id="selected-element-translation"
                          value={activeOverrides[selectedMessage.key] ?? ''}
                          onChange={updateSelectedOverride}
                          placeholder={selectedMessage.defaultTranslation}
                          aria-label="Selected element translation"
                        />
                        <ExpandableSection
                          toggleText={`Used on ${selectedMessage.pageIds.length} ${selectedMessage.pageIds.length === 1 ? 'page' : 'pages'}`}
                          isIndented
                        >
                          <Flex
                            gap={{ default: 'gapXs' }}
                            style={{ maxHeight: '12rem', overflowY: 'auto' }}
                          >
                            {selectedMessage.pageIds.map(pageId => (
                              <Button
                                key={pageId}
                                variant="link"
                                isInline
                                onClick={() => setActivePage(pageId)}
                                style={{ fontSize: 'var(--pf-t--global--font--size--body--sm)' }}
                              >
                                {pageId.replace(/\.html$/, '').replace(/-/g, ' ')}
                              </Button>
                            ))}
                          </Flex>
                        </ExpandableSection>
                      </FormGroup>
                    </StackItem>
                  )
                : (
                    <StackItem>
                      <small style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                        Select a translated label, button, input or message in the preview to edit its Keycloak message.
                      </small>
                    </StackItem>
                  )}
            </>
          )}
    </Stack>
  )
}
