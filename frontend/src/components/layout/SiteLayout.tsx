import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from '@/components/theme/ThemeProvider'
import { navigation } from '@/data/site'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const CinematicFooter = lazy(() => import('@/components/ui/motion-footer').then((module) => ({ default: module.CinematicFooter })))

type HeaderNavItem = {
  label: string
  href: string
  children?: HeaderNavItem[]
}

function visibleNavigationItems(items: unknown): HeaderNavItem[] {
  if (!Array.isArray(items)) return []

  return items
    .filter((item) => item && typeof item === 'object' && (item as any).visible !== false && String((item as any).label || '').trim() && String((item as any).href || '').trim())
    .map((item) => ({
      label: String((item as any).label).trim(),
      href: String((item as any).href).trim(),
      children: visibleNavigationItems((item as any).children),
    }))
}

export function SiteLayout() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isFooterVisible, setIsFooterVisible] = useState(false)
  const [shouldRenderFooter, setShouldRenderFooter] = useState(false)
  const [headerNavigation, setHeaderNavigation] = useState<HeaderNavItem[]>(navigation)
  const footerSentinelRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const isBookingPage = location.pathname.startsWith('/booking') || location.pathname.startsWith('/book/')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let cancelled = false

    api.publicSettings()
      .then((result) => {
        if (cancelled) return

        try {
          const parsed = JSON.parse(result.settings.navigation_items || '[]')
          if (Array.isArray(parsed)) {
            const visibleItems = visibleNavigationItems(parsed)
            if (visibleItems.length) setHeaderNavigation(visibleItems)
          }
        } catch {
          setHeaderNavigation(navigation)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isBookingPage) {
      setShouldRenderFooter(false)
      return
    }
    const footerSentinel = footerSentinelRef.current
    if (!footerSentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting)
        if (entry.isIntersecting) setShouldRenderFooter(true)
        if (entry.isIntersecting) setOpen(false)
      },
      { rootMargin: '900px 0px 0px 0px', threshold: 0.02 },
    )

    observer.observe(footerSentinel)
    return () => observer.disconnect()
  }, [isBookingPage])

  return (
    <div className="site-bg min-h-screen">
      <header>
        <nav data-state={open ? 'active' : undefined} className={cn('group fixed inset-x-0 top-0 z-[120] px-2 transition duration-300', isFooterVisible && 'pointer-events-none -translate-y-8 opacity-0')}>
          <div
            className={cn(
              'mx-auto mt-2 max-w-6xl rounded-2xl border border-[var(--line)] bg-[var(--surface)]/58 px-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 lg:px-8',
              isScrolled && 'max-w-4xl bg-[var(--surface)]/72 shadow-[var(--shadow-soft)] lg:px-5',
            )}
          >
            <div className="relative flex flex-wrap items-center justify-between gap-4 py-3 lg:gap-0 lg:py-4">
              <div className="flex w-full items-center justify-between gap-3 lg:w-auto">
                <Link to="/" className="flex items-center gap-3 text-[var(--foreground)]" onClick={() => setOpen(false)} aria-label="Bakhtech home">
                  <img
                    src={theme === 'light' ? '/bakhtech-logo-light.png' : '/bakhtech-logo-dark.png'}
                    alt="Bakhtech"
                    className="h-10 w-auto"
                    width="160"
                    height="40"
                    decoding="async"
                  />
                </Link>

                <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/82 text-[var(--foreground)] shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-[var(--surface-2)]"
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5 text-[#facc15]" /> : <Moon className="h-5 w-5 text-[#30373f]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    className="relative z-20 grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--foreground)] text-[var(--background)] shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition hover:opacity-90"
                  >
                    <Menu className="h-5 w-5 transition duration-200 group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                    <X className="absolute h-5 w-5 -rotate-180 scale-0 opacity-0 transition duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
                  </button>
                </div>
              </div>

              <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                <ul className="flex gap-8 text-sm">
                  {headerNavigation.map((item) => (
                    <li key={`${item.label}-${item.href}`} className="group/nav relative">
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            'text-soft block py-2 transition hover:text-[var(--foreground)]',
                            isActive && 'font-bold text-[var(--foreground)]',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                      {item.children?.length ? (
                        <div className="invisible absolute left-1/2 top-full z-20 min-w-48 -translate-x-1/2 translate-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface)]/96 p-2 opacity-0 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition group-hover/nav:visible group-hover/nav:translate-y-0 group-hover/nav:opacity-100">
                          {item.children.map((child) => (
                            <NavLink
                              key={`${child.label}-${child.href}`}
                              to={child.href}
                              className={({ isActive }) =>
                                cn(
                                  'block rounded-lg px-3 py-2 text-sm font-bold text-soft transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                                  isActive && 'bg-[var(--surface-2)] text-[var(--foreground)]',
                                )
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden w-full flex-wrap items-center justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface)]/96 p-3 shadow-2xl shadow-black/20 backdrop-blur-2xl group-data-[state=active]:block lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                <div className="lg:hidden">
                  <ul className="grid gap-2 text-base">
                    {headerNavigation.map((item) => (
                      <li key={`${item.label}-${item.href}`}>
                        <NavLink
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-black text-soft transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                              isActive && 'bg-[var(--surface-2)] text-[var(--foreground)]',
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                        {item.children?.length ? (
                          <div className="ml-4 mt-1 grid gap-1 border-l border-[var(--line)] pl-3">
                            {item.children.map((child) => (
                              <NavLink
                                key={`${child.label}-${child.href}`}
                                to={child.href}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                  cn(
                                    'flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-soft transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                                    isActive && 'bg-[var(--surface-2)] text-[var(--foreground)]',
                                  )
                                }
                              >
                                {child.label}
                              </NavLink>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 flex w-full flex-col gap-3 border-t border-[var(--line)] pt-3 sm:flex-row lg:mt-0 lg:w-fit lg:border-t-0 lg:pt-0">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="hidden min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)] lg:inline-flex"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <NavLink
                    to="/booking"
                    onClick={() => setOpen(false)}
                    className={cn('inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:hidden')}
                  >
                    Book a Call
                  </NavLink>

                  <NavLink
                    to="/booking"
                    onClick={() => setOpen(false)}
                    className={cn('hidden min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:inline-flex')}
                  >
                    Book a Call
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      {!isBookingPage && (
        <div ref={footerSentinelRef}>
          {shouldRenderFooter ? (
            <Suspense fallback={<div className="h-screen bg-[var(--background)]" />}>
              <CinematicFooter />
            </Suspense>
          ) : (
            <div className="h-screen bg-[var(--background)]" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  )
}
