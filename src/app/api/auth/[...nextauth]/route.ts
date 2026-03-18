import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fono-backend-production.up.railway.app'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === 'google' && account.id_token) {
        try {
          // Read is_signup flag from cookie (set by login/signup pages before OAuth)
          const cookieStore = await cookies()
          const isSignup = cookieStore.get('fono_is_signup')?.value === 'true'

          const res = await fetch(`${API_URL}/api/v1/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: account.id_token, is_signup: isSignup }),
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            if (res.status === 404 && body.detail === 'no_account') {
              return '/login?error=no_account'
            }
            console.error('Fono backend auth failed:', res.status)
            return false
          }

          const data = await res.json()
          user.fonoToken = data.token
          user.tenants = data.tenants
          user.id = data.user.id
        } catch (err) {
          console.error('Fono backend auth error:', err)
          return false
        }
      }
      return true
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.fonoToken = user.fonoToken
        token.tenants = user.tenants
        token.userId = user.id
      }
      // When client calls update(), re-fetch tenants from backend
      if (trigger === 'update' && token.fonoToken) {
        try {
          const res = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token.fonoToken}` },
          })
          if (res.ok) {
            const data = await res.json()
            token.tenants = data.tenants || []
          }
        } catch {
          // keep existing token on error
        }
      }
      return token
    },

    async session({ session, token }) {
      session.fonoToken = token.fonoToken as string
      session.tenants = token.tenants ?? []
      if (token.userId) {
        session.user.id = token.userId
      }
      return session
    },
  },
})

export { handler as GET, handler as POST }
