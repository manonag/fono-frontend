'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface Restaurant {
  id: string
  name: string
  location: string
  initials: string
}

const RESTAURANTS: Restaurant[] = [
  { id: '5c59ba59-2bf0-40a4-b15a-2d96c509ef29', name: 'Spice Garden', location: 'Tracy, CA', initials: 'SG' },
  { id: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Bawarchi Cafe', location: 'Fremont, CA', initials: 'BC' },
]

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
  const [current, setCurrent] = useState(RESTAURANTS[0])
  const [isAll, setIsAll] = useState(false)

  return (
    <RestaurantContext.Provider value={{
      current,
      restaurants: RESTAURANTS,
      setCurrent: (r) => { setCurrent(r); setIsAll(false) },
      isAll,
      setAll: () => setIsAll(true),
      tenantId: isAll ? 'all' : current.id,
      allTenantIds: RESTAURANTS.map(r => r.id),
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
