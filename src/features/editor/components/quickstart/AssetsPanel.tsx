import {
  Flex,
  Stack,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { InfoCircleIcon } from '@patternfly/react-icons'
import CustomAssetUploader from '../../../assets/components/CustomAssetUploader'

export function AssetsPanel() {
  return (
    <Stack hasGutter>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <Title headingLevel="h3" size="md">
          Assets
        </Title>
        <Tooltip content="Upload fonts, backgrounds, logos, favicons, and images for your theme.">
          <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)', cursor: 'help' }} />
        </Tooltip>
      </Flex>
      <CustomAssetUploader withCard={false} />
    </Stack>
  )
}
