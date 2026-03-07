import {
  mdiCodeBraces,
  mdiFileMultiple,
  mdiFileTree,
  mdiRocketLaunch,
  mdiUpload,
} from '@mdi/js'
import Icon from '@mdi/react'
import { Stack, StackItem, Tab, Tabs, TabTitleText, Tooltip } from '@patternfly/react-core'
import { Activity, lazy, Suspense, useState } from 'react'
import CustomAssetUploader from '../features/assets/components/CustomAssetUploader'
import QuickStartPanel from '../features/editor/components/QuickStartPanel'
import SelectionTree from '../features/editor/components/SelectionTree'
import { useDarkModeState } from '../features/editor/hooks/use-editor'
import PageManager from '../features/preview/components/PageManager'
import { cx } from '../lib/cx'

const StylingPanel = lazy(() => import('../features/editor/components/StylingPanel'))

export default function RightSidebar({
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDarkMode } = useDarkModeState()
  const [selectedTab, setSelectedTab] = useState(0)

  return (
    <Stack className={cx('gjs-right-sidebar', className)} style={{ height: '100%', minHeight: 0, ...style }} {...rest}>
      <StackItem>
        <Tabs
          activeKey={selectedTab}
          onSelect={(_event, key) => setSelectedTab(key as number)}
          style={{ minHeight: '48px' }}
        >
          <Tab
            eventKey={0}
            aria-label="Quick start"
            title={(
              <Tooltip content="Quick start" position="bottom">
                <TabTitleText><Icon size={1} path={mdiRocketLaunch} /></TabTitleText>
              </Tooltip>
            )}
          />
          <Tab
            eventKey={1}
            aria-label="Styling"
            title={(
              <Tooltip content="Styling" position="bottom">
                <TabTitleText><Icon size={1} path={mdiCodeBraces} /></TabTitleText>
              </Tooltip>
            )}
          />
          <Tab
            eventKey={2}
            aria-label="Selection tree"
            title={(
              <Tooltip content="Selection tree" position="bottom">
                <TabTitleText><Icon size={1} path={mdiFileTree} /></TabTitleText>
              </Tooltip>
            )}
          />
          <Tab
            eventKey={3}
            aria-label="Pages"
            title={(
              <Tooltip content="Pages" position="bottom">
                <TabTitleText><Icon size={1} path={mdiFileMultiple} /></TabTitleText>
              </Tooltip>
            )}
          />
          <Tab
            eventKey={4}
            aria-label="Uploads"
            title={(
              <Tooltip content="Uploads" position="bottom">
                <TabTitleText><Icon size={1} path={mdiUpload} /></TabTitleText>
              </Tooltip>
            )}
          />
        </Tabs>
      </StackItem>
      <StackItem isFilled style={{ minHeight: 0, overflowY: 'auto' }}>
        <Activity mode={selectedTab === 0 ? 'visible' : 'hidden'} name="QuickStart">
          <Suspense fallback={<div style={{ padding: 'var(--pf-t--global--spacer--md)', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>Loading quick start...</div>}>
            <QuickStartPanel key={isDarkMode ? 'quickstart-dark' : 'quickstart-light'} />
          </Suspense>
        </Activity>
        <Activity mode={selectedTab === 1 ? 'visible' : 'hidden'} name="Styling">
          <Suspense fallback={<div style={{ padding: 'var(--pf-t--global--spacer--md)', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>Loading styling tools...</div>}>
            <StylingPanel />
          </Suspense>
        </Activity>
        <Activity mode={selectedTab === 2 ? 'visible' : 'hidden'} name="SelectionTree">
          <SelectionTree />
        </Activity>
        <Activity mode={selectedTab === 3 ? 'visible' : 'hidden'} name="Pages">
          <PageManager />
        </Activity>
        <Activity mode={selectedTab === 4 ? 'visible' : 'hidden'} name="Uploads">
          <div style={{ padding: 'var(--pf-t--global--spacer--sm)' }}>
            <CustomAssetUploader />
          </div>
        </Activity>
      </StackItem>
    </Stack>
  )
}
