'use client'

import * as React from 'react'

/**
 * Subscribe to a CSS media query. Returns `false` on the server and during
 * the first client render, then tracks `window.matchMedia(query)`.
 *
 * @example const isDesktop = useMediaQuery('(min-width: 768px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(query)

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    setMatches(mediaQueryList.matches)
    mediaQueryList.addEventListener('change', onChange)

    return () => {
      mediaQueryList.removeEventListener('change', onChange)
    }
  }, [query])

  return matches
}
