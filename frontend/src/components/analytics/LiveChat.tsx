import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { SmartsuppLiveChat } from '@/components/analytics/SmartsuppLiveChat'
import { TidioLiveChat } from '@/components/analytics/TidioLiveChat'

type LiveChatProvider = 'tidio' | 'smartsupp' | 'disabled'

function normalizeProvider(value?: string): LiveChatProvider {
  if (value === 'smartsupp' || value === 'disabled') return value
  return 'tidio'
}

export function LiveChat() {
  const [provider, setProvider] = useState<LiveChatProvider | null>(null)

  useEffect(() => {
    let cancelled = false

    api.publicSettings()
      .then((result) => {
        if (!cancelled) setProvider(normalizeProvider(result.settings.liveChatProvider))
      })
      .catch(() => {
        if (!cancelled) setProvider('tidio')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (provider === 'tidio') return <TidioLiveChat />
  if (provider === 'smartsupp') return <SmartsuppLiveChat />

  return null
}
