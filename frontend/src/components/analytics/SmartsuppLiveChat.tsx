import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SMARTSUPP_KEY = '36d90c60f156a26f66a3dbf7e8b91a7ba52666e4'
const SMARTSUPP_SCRIPT_ID = 'smartsupp-live-chat-script'

type SmartsuppWindow = Window & {
  _smartsupp?: { key?: string }
  smartsupp?: ((...args: unknown[]) => void) & { _?: unknown[] }
}

function isBackendPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function hideSmartsupp() {
  const livechatWindow = window as SmartsuppWindow

  try {
    livechatWindow.smartsupp?.('chat:hide')
  } catch {
    // Smartsupp may not be fully initialized yet.
  }
}

function showSmartsupp() {
  const livechatWindow = window as SmartsuppWindow

  try {
    livechatWindow.smartsupp?.('chat:show')
  } catch {
    // Smartsupp may not be fully initialized yet.
  }
}

export function SmartsuppLiveChat() {
  const { pathname } = useLocation()
  const backendPath = isBackendPath(pathname)

  useEffect(() => {
    if (backendPath) {
      hideSmartsupp()
      return
    }

    const livechatWindow = window as SmartsuppWindow
    livechatWindow._smartsupp = livechatWindow._smartsupp || {}
    livechatWindow._smartsupp.key = SMARTSUPP_KEY

    if (!livechatWindow.smartsupp) {
      const queuedSmartsupp = (...args: unknown[]) => {
        queuedSmartsupp._?.push(args)
      }
      queuedSmartsupp._ = [] as unknown[]
      livechatWindow.smartsupp = queuedSmartsupp
    }

    let loaded = Boolean(document.getElementById(SMARTSUPP_SCRIPT_ID))
    let timeoutId: number | undefined

    const loadSmartsupp = () => {
      if (loaded || isBackendPath(window.location.pathname)) return

      loaded = true
      const script = document.createElement('script')
      script.id = SMARTSUPP_SCRIPT_ID
      script.type = 'text/javascript'
      script.charset = 'utf-8'
      script.async = true
      script.src = 'https://www.smartsuppchat.com/loader.js?'
      document.head.appendChild(script)
    }

    if (loaded) {
      showSmartsupp()
    }

    timeoutId = window.setTimeout(loadSmartsupp, 15000)
    window.addEventListener('scroll', loadSmartsupp, { passive: true, once: true })
    window.addEventListener('pointerdown', loadSmartsupp, { passive: true, once: true })

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener('scroll', loadSmartsupp)
      window.removeEventListener('pointerdown', loadSmartsupp)
    }
  }, [backendPath])

  return null
}
