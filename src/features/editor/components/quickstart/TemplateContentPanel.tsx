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
}

const formGroupStyle = { marginBottom: 0 }

function LocalizationHelp({ ariaLabel, tooltipContent }: { ariaLabel: string, tooltipContent: string }) {
  return (
    <Tooltip content={tooltipContent}>
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
    </Stack>
  )
}
