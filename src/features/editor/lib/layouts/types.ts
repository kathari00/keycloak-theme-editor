export type LayoutId = 'card' | 'horizontal' | 'split'

export const DEFAULT_LAYOUT_ID: LayoutId = 'card'

export interface LayoutBinding {
  id: LayoutId
  label: string
  css: string
}
