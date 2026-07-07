'use client'

import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

export function PageMotion({
  motionKey,
  children,
  className,
}: {
  motionKey: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={motionKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
}

export const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
}

export function MotionList({
  children,
  className,
  motionKey,
}: {
  children: React.ReactNode
  className?: string
  motionKey?: string | number
}) {
  return (
    <motion.div
      key={motionKey}
      variants={listContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionItem({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={listItemVariants} className={className} {...props}>
      {children}
    </motion.div>
  )
}

export function MotionSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  )
}
