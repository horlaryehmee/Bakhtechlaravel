import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MegaMenuItem = {
  id: number
  label: string
  subMenus?: {
    title: string
    items: {
      label: string
      description: string
      icon: React.ElementType
      link?: string
    }[]
  }[]
  link?: string
}

export interface MegaMenuProps extends React.HTMLAttributes<HTMLUListElement> {
  items: MegaMenuItem[]
  className?: string
}

const MegaMenu = React.forwardRef<HTMLUListElement, MegaMenuProps>(({ items, className, ...props }, ref) => {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)
  const [isHover, setIsHover] = React.useState<number | null>(null)

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel)
  }

  return (
    <ul ref={ref} className={cn('relative flex items-center space-x-0', className)} {...props}>
      {items.map((navItem) => {
        const hasSubMenus = Boolean(navItem.subMenus?.length)
        const content = (
          <>
            <span className="relative z-10">{navItem.label}</span>
            {hasSubMenus ? (
              <ChevronDown
                className={cn(
                  'relative z-10 h-4 w-4 transition-transform duration-300 group-hover:rotate-180',
                  openMenu === navItem.label && 'rotate-180',
                )}
              />
            ) : null}
            {(isHover === navItem.id || openMenu === navItem.label) && (
              <motion.div
                layoutId="hover-bg"
                className="absolute inset-0 size-full bg-white/10"
                style={{ borderRadius: 99 }}
              />
            )}
          </>
        )

        return (
          <li
            key={navItem.label}
            className="relative"
            onMouseEnter={() => handleHover(hasSubMenus ? navItem.label : null)}
            onMouseLeave={() => handleHover(null)}
          >
            {navItem.link && !hasSubMenus ? (
              <a
                href={navItem.link}
                className="group relative flex cursor-pointer items-center justify-center gap-1 px-4 py-1.5 text-sm text-white/60 transition-colors duration-300 hover:text-white"
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                {content}
              </a>
            ) : (
              <button
                className="group relative flex cursor-pointer items-center justify-center gap-1 px-4 py-1.5 text-sm text-white/60 transition-colors duration-300 hover:text-white"
                type="button"
                onMouseEnter={() => setIsHover(navItem.id)}
                onMouseLeave={() => setIsHover(null)}
              >
                {content}
              </button>
            )}

            <AnimatePresence>
              {openMenu === navItem.label && hasSubMenus ? (
                <div className="absolute left-0 top-full z-10 w-auto pt-2">
                  <motion.div
                    className="w-max border border-white/10 bg-[#0A0A0A] p-4 shadow-2xl shadow-black/40"
                    style={{ borderRadius: 16 }}
                    layoutId="menu"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <div className="flex w-fit shrink-0 space-x-9 overflow-hidden">
                      {navItem.subMenus?.map((sub) => (
                        <motion.div layout className="w-full" key={sub.title}>
                          <h3 className="mb-4 text-sm font-medium capitalize text-white/50">{sub.title}</h3>
                          <ul className="space-y-6">
                            {sub.items.map((item) => {
                              const Icon = item.icon
                              return (
                                <li key={item.label}>
                                  <a href={item.link ?? '#'} className="group flex items-start space-x-3">
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-white/30 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#0A0A0A]">
                                      <Icon className="h-5 w-5 flex-none" />
                                    </div>
                                    <div className="w-max leading-5">
                                      <p className="shrink-0 text-sm font-medium text-white">{item.label}</p>
                                      <p className="shrink-0 text-xs text-white/50 transition-colors duration-300 group-hover:text-white">
                                        {item.description}
                                      </p>
                                    </div>
                                  </a>
                                </li>
                              )
                            })}
                          </ul>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
})

MegaMenu.displayName = 'MegaMenu'

export default MegaMenu
