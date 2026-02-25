import { Button, FormSelect, FormSelectOption } from '@patternfly/react-core'
import { MoonIcon, SunIcon } from '@patternfly/react-icons'
import { editorActions } from '../features/editor/actions'
import { useDarkModeState, usePreviewState } from '../features/editor/use-editor'
import { cx } from '../styles/cx'
import TopbarButtons from './TopbarButtons'

export default function Topbar({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDarkMode } = useDarkModeState()
  const { deviceId } = usePreviewState()
  return (
    <div className={cx('gjs-top-sidebar flex flex-wrap items-start justify-between gap-2 p-1', className)}>
      <div className="flex items-center gap-2 flex-shrink-0">
        <FormSelect
          value={deviceId}
          onChange={(_event, value) => editorActions.setDeviceId(value as 'desktop' | 'tablet' | 'mobile')}
          aria-label="Select preview device"
        >
          <FormSelectOption value="desktop" label="Desktop" />
          <FormSelectOption value="tablet" label="Tablet" />
          <FormSelectOption value="mobile" label="Mobile" />
        </FormSelect>
        <Button
          variant="secondary"
          onClick={editorActions.toggleDarkMode}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
        />
      </div>
      <TopbarButtons />
    </div>
  )
}
