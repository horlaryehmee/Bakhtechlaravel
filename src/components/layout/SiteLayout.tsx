import { Menu, Moon, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '@/components/theme/ThemeProvider'
import { navigation } from '@/data/site'
import { cn } from '@/lib/utils'

export function SiteLayout() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="site-bg min-h-screen">
      <header>
        <nav data-state={open ? 'active' : undefined} className="group fixed inset-x-0 top-0 z-[120] px-2">
          <div
            className={cn(
              'mx-auto mt-2 max-w-6xl rounded-2xl border border-[var(--line)] bg-[var(--surface)]/58 px-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 lg:px-8',
              isScrolled && 'max-w-4xl bg-[var(--surface)]/72 shadow-[var(--shadow-soft)] lg:px-5',
            )}
          >
            <div className="relative flex flex-wrap items-center justify-between gap-5 py-3 lg:gap-0 lg:py-4">
              <div className="flex w-full justify-between lg:w-auto">
                <Link to="/" className="flex items-center gap-3 text-[var(--foreground)]" onClick={() => setOpen(false)} aria-label="Bakhtech home">
                  <img
                    src={theme === 'light' ? '/bakhtech-logo-light.png' : '/bakhtech-logo-dark.png'}
                    alt="Bakhtech"
                    className="h-10 w-auto"
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen((value) => !value)}
                  aria-label={open ? 'Close menu' : 'Open menu'}
                  className="relative z-20 -m-2 grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] lg:hidden"
                >
                  <Menu className="h-5 w-5 transition duration-200 group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                  <X className="absolute h-5 w-5 -rotate-180 scale-0 opacity-0 transition duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
                </button>
              </div>

              <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                <ul className="flex gap-8 text-sm">
                  {navigation.map((item) => (
                    <li key={item.href}>
                      <NavLink
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            'text-soft block transition hover:text-[var(--foreground)]',
                            isActive && 'font-bold text-[var(--foreground)]',
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hidden w-full flex-wrap items-center justify-end rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl shadow-black/20 group-data-[state=active]:block lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                <div className="lg:hidden">
                  <ul className="space-y-5 text-base">
                    {navigation.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'text-soft block transition hover:text-[var(--foreground)]',
                              isActive && 'font-bold text-[var(--foreground)]',
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row lg:mt-0 lg:w-fit">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="lg:hidden">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </button>

                  <NavLink
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className={cn('inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:hidden')}
                  >
                    Get Started
                  </NavLink>

                  <NavLink
                    to="/contact"
                    onClick={() => setOpen(false)}
                    className={cn('hidden min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:inline-flex')}
                  >
                    Get Started
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
      <footer className="border-t py-10" style={{ background: 'var(--section-strong)', borderColor: 'var(--line)' }}>
        <div className="container-x flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-main text-sm font-black uppercase tracking-[0.2em]">Bakhtech Solutions</p>
            <p className="text-soft mt-2 max-w-xl text-sm">
              Elevate Your Digital Presence with Bakhtech Solutions. Crafting Professional Websites for Every Business.
              Precision, Performance, Perfection - Your Success, Our Mission.
            </p>
          </div>
          <p className="text-soft text-sm">&copy; 2026 Bakhtech Solutions. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

