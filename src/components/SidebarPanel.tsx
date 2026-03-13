import { Stack, StackItem, Title } from '@patternfly/react-core'
import { cx } from '../lib/cx'

interface SidebarPanelProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  bodyStyle?: React.CSSProperties
  fullHeight?: boolean
}

export default function SidebarPanel({
  title,
  children,
  className,
  style,
  bodyStyle,
  fullHeight = false,
  ...rest
}: SidebarPanelProps) {
  return (
    <section
      className={cx(className)}
      style={{
        margin: 'var(--pf-t--global--spacer--sm)',
        padding: 'var(--pf-t--global--spacer--lg)',
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        borderRadius: 'var(--pf-t--global--border--radius--medium)',
        ...(fullHeight
          ? {
              height: 'calc(100% - var(--pf-t--global--spacer--lg))',
              display: 'flex',
              flexDirection: 'column',
            }
          : {}),
        ...style,
      }}
      {...rest}
    >
      <Stack hasGutter style={fullHeight ? { height: '100%', minHeight: 0 } : undefined}>
        <StackItem>
          <Title headingLevel="h2" size="lg">
            {title}
          </Title>
        </StackItem>
        <StackItem
          isFilled={fullHeight}
          style={fullHeight
            ? {
                minHeight: 0,
                ...bodyStyle,
              }
            : bodyStyle}
        >
          {children}
        </StackItem>
      </Stack>
    </section>
  )
}
