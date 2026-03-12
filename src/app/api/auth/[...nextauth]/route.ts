import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

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
          const res = await fetch(`${API_URL}/api/v1/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: account.id_token }),
          })

          if (!res.ok) {
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

    async jwt({ token, user }) {
      if (user) {
        token.fonoToken = user.fonoToken
        token.tenants = user.tenants
        token.userId = user.id
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
