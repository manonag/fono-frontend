'use client'

import { useSession } from 'next-auth/react'

export function useFonoToken(): string | undefined {
  const { data: session } = useSession()
  return session?.fonoToken
}
