import { cn } from '@/lib/utils'

type BoxesProps = {
  className?: string
}

export function Boxes({ className }: BoxesProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        className,
      )}
    >
      <div className="portfolio-css-grid absolute left-1/2 top-1/2 h-[150%] w-[170%] -translate-x-1/2 -translate-y-1/2" />
    </div>
  )
}
