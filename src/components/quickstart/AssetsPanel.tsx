import {
  Panel,
  PanelMain,
  PanelMainBody,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import CustomAssetUploader from '../CustomAssetUploader'

export function AssetsPanel() {
  return (
    <Panel>
      <PanelMain>
        <PanelMainBody>
          <div className="flex items-center gap-2 mb-3">
            <h4 className="mb-0">Assets</h4>
            <Tooltip content="Upload fonts, backgrounds, logos and favicons for your theme.">
              <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
            </Tooltip>
          </div>
          <CustomAssetUploader />
        </PanelMainBody>
      </PanelMain>
    </Panel>
  )
}
