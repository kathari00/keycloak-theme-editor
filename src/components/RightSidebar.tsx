import {
  mdiCodeBraces,
  mdiFileMultiple,
  mdiFileTree,
  mdiRocketLaunch,
  mdiUpload,
} from '@mdi/js'
import Icon from '@mdi/react'
import { Tab, Tabs, TabTitleText, Tooltip } from '@patternfly/react-core'
import { Activity, lazy, Suspense, useState } from 'react'
import { useDarkModeState } from '../features/editor/use-editor'
import { cx } from '../styles/cx'
import CustomAssetUploader from './CustomAssetUploader'
import PageManager from './PageManager'
import QuickStartPanel from './QuickStartPanel'
import SelectionTree from './SelectionTree'

const StylingPanel = lazy(() => import('./StylingPanel'))

export default function RightSidebar({
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDarkMode } = useDarkModeState()
  const [selectedTab, setSelectedTab] = useState(0)

  return (
    <div className={cx('gjs-right-sidebar flex flex-col min-h-0', className)} style={style} {...rest}>
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
      <div className="overflow-y-auto flex-grow min-h-0">
        <Activity mode={selectedTab === 0 ? 'visible' : 'hidden'} name="QuickStart">
          <Suspense fallback={<div className="p-3 text-sm text-gray-500">Loading quick start...</div>}>
            <QuickStartPanel key={isDarkMode ? 'quickstart-dark' : 'quickstart-light'} />
          </Suspense>
        </Activity>
        <Activity mode={selectedTab === 1 ? 'visible' : 'hidden'} name="Styling">
          <Suspense fallback={<div className="p-3 text-sm text-gray-500">Loading styling tools...</div>}>
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
          <div className="p-2">
            <CustomAssetUploader />
          </div>
        </Activity>
      </div>
    </div>
  )
}
