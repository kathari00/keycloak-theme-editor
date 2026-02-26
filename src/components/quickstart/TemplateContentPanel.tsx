import {
  Button,
  Checkbox,
  FormGroup,
  Panel,
  PanelMain,
  PanelMainBody,
  TextInput,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon, LanguageIcon } from '@patternfly/react-icons'
import { editorActions } from '../../features/editor/actions'
import { isValidExternalLegalLinkUrl } from '../../features/preview/legal-link-url'

interface TemplateContentPanelProps {
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
}

const formGroupStyle = { marginBottom: 0 }

function LocalizationHelp({ ariaLabel, tooltipContent }: { ariaLabel: string, tooltipContent: string }) {
  return (
    <Tooltip content={tooltipContent}>
      <Button
        type="button"
        variant="plain"
        aria-label={ariaLabel}
        icon={<LanguageIcon />}
        style={{ color: 'var(--pf-v5-global--info-color--100)' }}
      />
    </Tooltip>
  )
}

export function TemplateContentPanel({
  showClientName,
  showRealmName,
  infoMessage,
  imprintUrl,
  dataProtectionUrl,
}: TemplateContentPanelProps) {
  const updateShowClientName = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    editorActions.setQuickStartExtras({ showClientName: checked })
  }

  const updateShowRealmName = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    editorActions.setQuickStartExtras({ showRealmName: checked })
  }

  const updateInfoMessage = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    editorActions.setQuickStartExtras({ infoMessage: value })
  }

  const updateImprintUrl = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    editorActions.setQuickStartExtras({ imprintUrl: value })
  }

  const updateDataProtectionUrl = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    editorActions.setQuickStartExtras({ dataProtectionUrl: value })
  }

  const imprintUrlValidated = !imprintUrl || isValidExternalLegalLinkUrl(imprintUrl) ? 'default' : 'error'
  const dataProtectionUrlValidated = !dataProtectionUrl || isValidExternalLegalLinkUrl(dataProtectionUrl) ? 'default' : 'error'

  return (
    <Panel>
      <PanelMain>
        <PanelMainBody>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="mb-0">Template content</h4>
            <Tooltip content="Configure dynamic content shown in the login template.">
              <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
            </Tooltip>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Checkbox
                id="quick-start-realm-name"
                label="Show realm name"
                isChecked={showRealmName}
                onChange={updateShowRealmName}
              />
              <Checkbox
                id="quick-start-client-name"
                label="Show client name"
                isChecked={showClientName}
                onChange={updateShowClientName}
              />
            </div>
            <FormGroup
              label="Show info message"
              labelHelp={<LocalizationHelp ariaLabel="Info message localization help" tooltipContent="To add translations use i18n key infoMessage" />}
              fieldId="quick-start-info-message"
              style={formGroupStyle}
            >
              <TextInput
                id="quick-start-info-message"
                value={infoMessage}
                onChange={updateInfoMessage}
                aria-label="Info message"
              />
            </FormGroup>
            <FormGroup
              label="Imprint URL"
              labelHelp={<LocalizationHelp ariaLabel="Imprint URL localization help" tooltipContent="To add translations use i18n key imprintUrl" />}
              fieldId="quick-start-imprint"
              style={formGroupStyle}
            >
              <TextInput
                id="quick-start-imprint"
                value={imprintUrl}
                onChange={updateImprintUrl}
                placeholder="https://..."
                aria-label="Imprint URL"
                validated={imprintUrlValidated}
              />
            </FormGroup>
            <FormGroup
              label="Data protection URL"
              labelHelp={<LocalizationHelp ariaLabel="Data protection URL localization help" tooltipContent="To add translations use i18n key dataProtectionUrl" />}
              fieldId="quick-start-data-protection"
              style={formGroupStyle}
            >
              <TextInput
                id="quick-start-data-protection"
                value={dataProtectionUrl}
                onChange={updateDataProtectionUrl}
                placeholder="https://..."
                aria-label="Data protection URL"
                validated={dataProtectionUrlValidated}
              />
            </FormGroup>
          </div>
        </PanelMainBody>
      </PanelMain>
    </Panel>
  )
}
