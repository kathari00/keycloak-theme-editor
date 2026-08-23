import {
  Button,
  Checkbox,
  Flex,
  FormGroup,
  Grid,
  GridItem,
  Stack,
  TextInput,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon, LanguageIcon } from '@patternfly/react-icons'
import { isValidExternalLegalLinkUrl } from '../../../preview/lib/legal-link-url'
import { editorActions } from '../../actions'

interface TemplateContentPanelProps {
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
  imprintLabel: string
  dataProtectionLabel: string
}

const formGroupStyle = { marginBottom: 0 }

const TRANSLATION_HINT = 'Translate this in the Languages section below.'

function LocalizationHelp({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Tooltip content={TRANSLATION_HINT}>
      <Button
        type="button"
        variant="plain"
        hasNoPadding
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
  imprintLabel,
  dataProtectionLabel,
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

  const updateImprintLabel = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    editorActions.setQuickStartExtras({ imprintLabel: value })
  }

  const updateDataProtectionLabel = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    editorActions.setQuickStartExtras({ dataProtectionLabel: value })
  }

  const imprintUrlValidated = !imprintUrl || isValidExternalLegalLinkUrl(imprintUrl) ? 'default' : 'error'
  const dataProtectionUrlValidated = !dataProtectionUrl || isValidExternalLegalLinkUrl(dataProtectionUrl) ? 'default' : 'error'

  return (
    <Stack hasGutter>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <Title headingLevel="h3" size="md">
          Template content
        </Title>
        <Tooltip content="Configure dynamic content shown in the login template.">
          <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
        </Tooltip>
      </Flex>
      <Grid hasGutter md={6}>
        <GridItem>
          <Checkbox
            id="quick-start-realm-name"
            label="Show realm name"
            isChecked={showRealmName}
            onChange={updateShowRealmName}
          />
        </GridItem>
        <GridItem>
          <Checkbox
            id="quick-start-client-name"
            label="Show client name"
            isChecked={showClientName}
            onChange={updateShowClientName}
          />
        </GridItem>
      </Grid>
      <FormGroup
        label="Show info message"
        labelHelp={<LocalizationHelp ariaLabel="Info message localization help" />}
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
        label="Imprint link text"
        labelHelp={<LocalizationHelp ariaLabel="Imprint link text localization help" />}
        fieldId="quick-start-imprint-label"
        style={formGroupStyle}
      >
        <TextInput
          id="quick-start-imprint-label"
          value={imprintLabel}
          onChange={updateImprintLabel}
          aria-label="Imprint link text"
        />
      </FormGroup>
      <FormGroup
        label="Data protection URL"
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
      <FormGroup
        label="Data protection link text"
        labelHelp={<LocalizationHelp ariaLabel="Data protection link text localization help" />}
        fieldId="quick-start-data-protection-label"
        style={formGroupStyle}
      >
        <TextInput
          id="quick-start-data-protection-label"
          value={dataProtectionLabel}
          onChange={updateDataProtectionLabel}
          aria-label="Data protection link text"
        />
      </FormGroup>
    </Stack>
  )
}
