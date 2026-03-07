import {
  Flex,
  Panel,
  PanelMain,
  PanelMainBody,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import CustomAssetUploader from '../../../assets/components/CustomAssetUploader'

export function AssetsPanel() {
  return (
    <Panel>
      <PanelMain>
        <PanelMainBody>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }} style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
            <h4 style={{ margin: 0 }}>Assets</h4>
            <Tooltip content="Upload fonts, backgrounds, logos and favicons for your theme.">
              <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
            </Tooltip>
          </Flex>
          <CustomAssetUploader />
        </PanelMainBody>
      </PanelMain>
    </Panel>
  )
}
