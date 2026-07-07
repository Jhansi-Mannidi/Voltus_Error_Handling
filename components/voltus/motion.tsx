'use client'

import { Children, isValidElement } from 'react'
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export const EASE = [0.22, 1, 0.36, 1] as const

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
      transition={{ duration: 0.28, delay, ease: EASE }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  )
}

export function MotionKpiGrid({
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
      {Children.map(children, (child, i) => (
        <MotionItem key={isValidElement(child) && child.key != null ? String(child.key) : i}>
          {child}
        </MotionItem>
      ))}
    </motion.div>
  )
}

export function MotionTabPanel({
  activeKey,
  tabKey,
  children,
  className,
}: {
  activeKey?: string | number
  tabKey?: string | number
  children: React.ReactNode
  className?: string
}) {
  const key = activeKey ?? tabKey ?? 'panel'
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={String(key)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: EASE }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function MotionOverlay({
  className,
  onClick,
}: {
  className?: string
  onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className={cn('fixed inset-0', className)}
      onClick={onClick}
      aria-hidden
    />
  )
}
