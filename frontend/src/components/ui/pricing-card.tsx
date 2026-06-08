import React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative w-full max-w-xs rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_18px_46px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950',
        className,
      )}
      {...props}
    />
  )
}

function Header({ className, children, glassEffect = true, ...props }: React.ComponentProps<'div'> & { glassEffect?: boolean }) {
  return (
    <div className={cn('relative mb-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70', className)} {...props}>
      {glassEffect && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-48 rounded-[inherit]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.12) 40%, rgba(0,0,0,0) 100%)',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}

function Plan({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-8 flex items-center justify-between', className)} {...props} />
}

function Description({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...props} />
}

function PlanName({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn("flex items-center gap-2 text-sm font-medium text-slate-500 [&_svg:not([class*='size-'])]:size-4", className)} {...props} />
}

function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('rounded-full border border-slate-900/20 px-2 py-0.5 text-xs text-slate-800', className)} {...props} />
}

function Price({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-3 flex items-end gap-1', className)} {...props} />
}

function MainPrice({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('text-3xl font-extrabold tracking-tight', className)} {...props} />
}

function Period({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('pb-1 text-sm text-slate-700', className)} {...props} />
}

function OriginalPrice({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('ml-auto mr-1 text-lg text-slate-500 line-through', className)} {...props} />
}

function Body({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('space-y-6 p-3', className)} {...props} />
}

function List({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul className={cn('space-y-3', className)} {...props} />
}

function ListItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li className={cn('flex items-start gap-3 text-sm text-slate-600', className)} {...props} />
}

function Separator({ children = 'Upgrade to access', className, ...props }: React.ComponentProps<'div'> & { children?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-sm text-slate-500', className)} {...props}>
      <span className="h-px flex-1 bg-slate-300" />
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-slate-300" />
    </div>
  )
}

export {
  Card,
  Header,
  Description,
  Plan,
  PlanName,
  Badge,
  Price,
  MainPrice,
  Period,
  OriginalPrice,
  Body,
  List,
  ListItem,
  Separator,
}
