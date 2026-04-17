import { derived, readable } from 'svelte/store'
import { router } from 'svelte-spa-router'

const getRouteLocation = () => router.location || '/'

export const routeLocation = readable(getRouteLocation(), (set) => {
  if (typeof window === 'undefined') return () => {}

  const updateRouteLocation = () => {
    set(getRouteLocation())
  }

  window.addEventListener('hashchange', updateRouteLocation)

  return () => {
    window.removeEventListener('hashchange', updateRouteLocation)
  }
})

export const activeChatId = derived(routeLocation, ($routeLocation) => {
  const match = $routeLocation.match(/^\/chat\/(\d+)/)
  return match ? parseInt(match[1], 10) : undefined
})
