import {
  mdiCodeBraces,
  mdiFileMultiple,
  mdiFileTree,
  mdiRocketLaunch,
  mdiUpload,
} from '@mdi/js'
import Icon from '@mdi/react'
import {
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleIcon,
} from '@patternfly/react-core'
import { Activity, lazy, Suspense, useState } from 'react'
import CustomAssetUploader from '../features/assets/components/CustomAssetUploader'
import QuickStartPanel from '../features/editor/components/QuickStartPanel'
import SelectionTree from '../features/editor/components/SelectionTree'
import { useDarkModeState } from '../features/editor/hooks/use-editor'
import PageManager from '../features/preview/components/PageManager'
import { cx } from '../lib/cx'

const StylingPanel = lazy(() => import('../features/editor/components/StylingPanel'))
type SidebarSectionKey = 'quick-start' | 'styling' | 'selection' | 'pages' | 'uploads'

const sidebarTabs: Array<{
  icon: string
  id: SidebarSectionKey
  label: string
}> = [
  { id: 'quick-start', label: 'Quick start', icon: mdiRocketLaunch },
  { id: 'styling', label: 'Styling', icon: mdiCodeBraces },
  { id: 'selection', label: 'Selection tree', icon: mdiFileTree },
  { id: 'pages', label: 'Pages', icon: mdiFileMultiple },
  { id: 'uploads', label: 'Uploads', icon: mdiUpload },
]

export default function RightSidebar({
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDarkMode } = useDarkModeState()
  const [selectedTab, setSelectedTab] = useState<SidebarSectionKey>('quick-start')

  return (
    <Stack className={cx('gjs-right-sidebar', className)} style={{ height: '100%', minHeight: 0, ...style }} {...rest}>
      <StackItem>
        <Tabs
          aria-label="Editor tool sections"
          activeKey={selectedTab}
          onSelect={(_event, key) => setSelectedTab(key as SidebarSectionKey)}
          inset={{ default: 'insetNone' }}
          mountOnEnter
          unmountOnExit
          style={{ minHeight: '48px' }}
        >
          {sidebarTabs.map(tab => (
            <Tab
              key={tab.id}
              eventKey={tab.id}
              aria-label={tab.label}
              title={(
                <TabTitleIcon>
                  <Icon size={0.9} path={tab.icon} />
                </TabTitleIcon>
              )}
            />
          ))}
        </Tabs>
      </StackItem>
      <StackItem isFilled style={{ minHeight: 0, overflowY: 'auto' }}>
        <Activity mode={selectedTab === 'quick-start' ? 'visible' : 'hidden'} name="QuickStart">
          <Suspense fallback={<div style={{ padding: 'var(--pf-t--global--spacer--md)', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>Loading quick start...</div>}>
            <QuickStartPanel key={isDarkMode ? 'quickstart-dark' : 'quickstart-light'} />
          </Suspense>
        </Activity>
        <Activity mode={selectedTab === 'styling' ? 'visible' : 'hidden'} name="Styling">
          <Suspense fallback={<div style={{ padding: 'var(--pf-t--global--spacer--md)', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>Loading styling tools...</div>}>
            <StylingPanel />
          </Suspense>
        </Activity>
        <Activity mode={selectedTab === 'selection' ? 'visible' : 'hidden'} name="SelectionTree">
          <SelectionTree />
        </Activity>
        <Activity mode={selectedTab === 'pages' ? 'visible' : 'hidden'} name="Pages">
          <PageManager />
        </Activity>
        <Activity mode={selectedTab === 'uploads' ? 'visible' : 'hidden'} name="Uploads">
          <CustomAssetUploader />
        </Activity>
      </StackItem>
    </Stack>
  )
}
