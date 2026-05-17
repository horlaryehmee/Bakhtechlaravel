import { ArrowUpRight, Menu, Moon, Sparkles, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '@/components/theme/ThemeProvider'
import { navigation } from '@/data/site'
import { cn } from '@/lib/utils'

export function SiteLayout() {
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="site-bg min-h-screen">
      <header className="fixed inset-x-0 top-0 z-[100] px-4 pt-4">
        <nav
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl border px-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-5"
          style={{
            background: 'var(--header-bg)',
            borderColor: 'var(--header-border)',
            color: 'var(--header-text)',
          }}
        >
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setOpen(false)}
            aria-label="Bakhtech home"
          >
            <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-[#111827] shadow-[inset_0_-8px_18px_rgba(17,24,39,0.12)]">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,197,253,0.95),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.72),transparent_36%)]" />
              <span className="relative text-sm font-black tracking-tight">BT</span>
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-black uppercase tracking-[0.18em]">Bakhtech</span>
              <span className="hidden text-[11px] font-medium sm:block" style={{ color: 'var(--header-muted)' }}>
                Transforming Ideas into Digital Masterpieces
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full border p-1 lg:flex" style={{ borderColor: 'var(--header-border)', background: 'color-mix(in srgb, var(--header-text) 6%, transparent)' }}>
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition hover:bg-[color-mix(in_srgb,var(--header-text)_10%,transparent)]',
                    isActive
                      ? 'bg-[var(--header-text)] text-[var(--background)] shadow-sm'
                      : 'text-[color-mix(in_srgb,var(--header-text)_62%,transparent)] hover:text-[var(--header-text)]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-xl border transition hover:-translate-y-0.5"
              style={{
                borderColor: 'var(--header-border)',
                background: 'color-mix(in srgb, var(--header-text) 8%, transparent)',
                color: 'var(--header-text)',
              }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <NavLink
              to="/contact"
              className="group hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--header-text)] px-4 text-sm font-bold text-[var(--background)] transition hover:-translate-y-0.5 md:inline-flex"
            >
              Request quote
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </NavLink>

            <button
              className="grid h-11 w-11 place-items-center rounded-xl border lg:hidden"
              style={{
                borderColor: 'var(--header-border)',
                background: 'color-mix(in srgb, var(--header-text) 8%, transparent)',
                color: 'var(--header-text)',
              }}
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {open ? (
          <div className="mx-auto w-full max-w-7xl pb-4 lg:hidden">
            <div className="surface-card mt-3 overflow-hidden rounded-2xl p-2 shadow-2xl backdrop-blur-2xl">
              <div className="surface-muted text-soft mb-2 flex items-center gap-2 rounded-xl px-3 py-3 text-sm">
                <Sparkles className="h-4 w-4 text-[#12c8a0]" />
                Precision, Performance, Perfection
              </div>
              {navigation.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'text-soft flex rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]',
                      isActive && 'bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <NavLink
                to="/contact"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-[var(--foreground)] text-sm font-black text-[var(--background)]"
              >
                Request A Quote
              </NavLink>
            </div>
          </div>
        ) : null}
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

