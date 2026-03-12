'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface Restaurant {
  id: string
  name: string
  location: string
  initials: string
}

// Fallback restaurants used when session has no tenants (e.g. during loading)
const FALLBACK_RESTAURANTS: Restaurant[] = [
  { id: '5c59ba59-2bf0-40a4-b15a-2d96c509ef29', name: 'Spice Garden', location: 'Tracy, CA', initials: 'SG' },
  { id: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Bawarchi Cafe', location: 'Fremont, CA', initials: 'BC' },
]

function tenantsToRestaurants(tenants: { id: string; name: string; slug: string; role: string }[]): Restaurant[] {
  return tenants.map(t => ({
    id: t.id,
    name: t.name,
    location: '',
    initials: t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
  }))
}

interface RestaurantContextType {
  current: Restaurant
  restaurants: Restaurant[]
  setCurrent: (r: Restaurant) => void
  isAll: boolean
  setAll: () => void
  tenantId: string
  allTenantIds: string[]
}

const RestaurantContext = createContext<RestaurantContextType | null>(null)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const sessionTenants = session?.tenants

  const [restaurants, setRestaurants] = useState<Restaurant[]>(FALLBACK_RESTAURANTS)
  const [current, setCurrent] = useState<Restaurant>(FALLBACK_RESTAURANTS[0])
  const [isAll, setIsAll] = useState(false)

  useEffect(() => {
    if (sessionTenants && sessionTenants.length > 0) {
      const mapped = tenantsToRestaurants(sessionTenants)
      setRestaurants(mapped)
      // Only update current if it's not already one of the session tenants
      if (!mapped.find(r => r.id === current.id)) {
        setCurrent(mapped[0])
      }
    }
  }, [sessionTenants]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <RestaurantContext.Provider value={{
      current,
      restaurants,
      setCurrent: (r) => { setCurrent(r); setIsAll(false) },
      isAll,
      setAll: () => setIsAll(true),
      tenantId: isAll ? 'all' : current.id,
      allTenantIds: restaurants.map(r => r.id),
    }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext)
  if (!ctx) throw new Error('useRestaurant must be inside RestaurantProvider')
  return ctx
}
