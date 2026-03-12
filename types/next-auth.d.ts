import 'next-auth'
import 'next-auth/jwt'

interface FonoTenant {
  id: string
  name: string
  slug: string
  role: string
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
