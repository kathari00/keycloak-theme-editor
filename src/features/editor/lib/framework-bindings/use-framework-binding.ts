import type { BootstrapVariantId, FrameworkBinding, FrameworkId } from './types'
import { useEffect, useState } from 'react'
import { getFrameworkBindingMetadata, loadFrameworkBinding } from './registry'

export function useFrameworkBinding(frameworkId: FrameworkId, bootstrapVariantId: BootstrapVariantId): FrameworkBinding {
  const bindingKey = `${frameworkId}:${bootstrapVariantId}`
  const [loaded, setLoaded] = useState<{ binding: FrameworkBinding, key: string } | null>(null)

  useEffect(() => {
    let active = true
    void loadFrameworkBinding(frameworkId, bootstrapVariantId).then((loadedBinding) => {
      if (active)
        setLoaded({ binding: loadedBinding, key: bindingKey })
    })
    return () => {
      active = false
    }
  }, [bindingKey, bootstrapVariantId, frameworkId])

  return loaded?.key === bindingKey ? loaded.binding : getFrameworkBindingMetadata(frameworkId)
}
