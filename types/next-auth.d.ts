import 'next-auth'
import 'next-auth/jwt'

interface FonoTenant {
  id: string
  name: string
  slug: string
  role: string
  // IANA TZ identifier (e.g. "America/Los_Angeles") populated by the
  // backend /auth/google and /auth/me responses. Optional in the type
  // for resilience: a pre-migration token in the wild may not carry it,
  // and the frontend falls back to America/Los_Angeles.
  timezone?: string
}

declare module 'next-auth' {
  interface Session {
    fonoToken: string
    tenants: FonoTenant[]
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface User {
    fonoToken?: string
    tenants?: FonoTenant[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    fonoToken?: string
    tenants?: FonoTenant[]
    userId?: string
  }
}
