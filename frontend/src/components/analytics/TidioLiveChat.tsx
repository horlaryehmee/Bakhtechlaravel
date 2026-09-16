import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TIDIO_SCRIPT_ID = 'tidio-live-chat-script'
const TIDIO_SCRIPT_SRC = '//code.tidio.co/senscoal4ztlvxncl98efrfjyj99ew1c.js'

type TidioWindow = Window & {
  tidioChatApi?: {
    display: (visible: boolean) => void
    hide: () => void
    show: () => void
  }
}

function shouldHideLiveChat(pathname: string) {
  return pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/invoice/')
    || pathname.startsWith('/quote/')
    || pathname.startsWith('/receipt/')
}

function setTidioVisibility(hidden: boolean) {
  const chatApi = (window as TidioWindow).tidioChatApi
  if (!chatApi) return

  chatApi.display(!hidden)

  if (hidden) chatApi.hide()
  else chatApi.show()
}

export function TidioLiveChat() {
  const { pathname } = useLocation()
  const hideLiveChat = shouldHideLiveChat(pathname)

  useEffect(() => {
    const syncVisibility = () => setTidioVisibility(hideLiveChat)

    document.addEventListener('tidioChat-ready', syncVisibility)

    if (!hideLiveChat && !document.getElementById(TIDIO_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = TIDIO_SCRIPT_ID
      script.src = TIDIO_SCRIPT_SRC
      script.async = true
      script.setAttribute('data-cfasync', 'false')
      document.head.appendChild(script)
    }

    syncVisibility()

    return () => {
      document.removeEventListener('tidioChat-ready', syncVisibility)
    }
  }, [hideLiveChat])

  return null
}
