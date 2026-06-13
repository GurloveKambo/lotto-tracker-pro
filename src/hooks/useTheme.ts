import { useEffect } from 'react'
import { useStore } from '../stores'

const ALL_THEME_CLASSES = [
  'dark',
  'theme-midnight',
  'theme-graphite',
  'theme-ocean',
  'theme-forest',
  'theme-gold',
]

export function useTheme() {
  const { themeSettings } = useStore()
  const { theme } = themeSettings

  useEffect(() => {
    const root = document.documentElement
    // Clear all theme classes
    ALL_THEME_CLASSES.forEach(c => root.classList.remove(c))

    switch (theme) {
      case 'light':
        // no classes — default light
        break
      case 'dark':
        root.classList.add('dark')
        break
      case 'system':
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark')
        }
        break
      case 'midnight':
        root.classList.add('dark', 'theme-midnight')
        break
      case 'graphite':
        root.classList.add('dark', 'theme-graphite')
        break
      case 'ocean':
        root.classList.add('dark', 'theme-ocean')
        break
      case 'forest':
        root.classList.add('dark', 'theme-forest')
        break
      case 'gold':
        root.classList.add('dark', 'theme-gold')
        break
    }
  }, [theme])

  // System theme: listen for OS preference changes
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])
}
