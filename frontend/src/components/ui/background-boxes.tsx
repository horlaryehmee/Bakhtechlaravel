import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type BoxesProps = {
  className?: string
}

export const BoxesCore = ({ className, ...rest }: BoxesProps) => {
  const rows = new Array(150).fill(1)
  const cols = new Array(100).fill(1)
  const colors = [
    '#5f6f7f',
    '#6f8294',
    '#8197aa',
    '#91a7ba',
    '#4d5b68',
    '#a0b5c8',
  ]

  const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)]

  return (
    <div
      style={{
        transform: 'translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)',
      }}
      className={cn(
        'absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4',
        className,
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <motion.div key={`row${i}`} className="relative h-8 w-16 border-l border-[#4f5c68]/70">
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col${j}`}
              className="relative h-8 w-16 border-r border-t border-[#4f5c68]/70"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 stroke-[1px] text-[#5f6d7a]/80"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  )
}

export const Boxes = React.memo(BoxesCore)
