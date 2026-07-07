'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function scrollToSection(id: string) {
  const main = document.querySelector('main')
  if (!id) {
    main?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const el = document.getElementById(id)
  if (!el) return
  if (!main) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  const mainRect = main.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  main.scrollTo({
    top: main.scrollTop + elRect.top - mainRect.top - 24,
    behavior: 'smooth',
  })
}

/** Scroll to a hash anchor after route / query navigation. */
export function useHashScroll() {
  const pathname = usePathname()

  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace('#', '')
      window.setTimeout(() => scrollToSection(hash), 80)
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [pathname])
}

/** Imperative scroll helper for sub-nav hash links (Next.js may not fire hashchange). */
export function scrollToSectionById(id: string) {
  window.setTimeout(() => scrollToSection(id), 100)
}
