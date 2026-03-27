import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// 简单的内存存储（生产环境应使用 KV 或 Turso）
const userStore = new Map<string, { id: string; email: string; name: string; quota: number; used: number }>()

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ user, account }) {
      console.log('[SignIn] Provider:', account?.provider, 'Email:', user.email)
      
      if (account?.provider === 'google' && user.email) {
        // 简单存储用户信息
        const existingUser = userStore.get(user.email)
        
        if (!existingUser) {
          userStore.set(user.email, {
            id: crypto.randomUUID(),
            email: user.email,
            name: user.name || '',
            quota: 3, // 每日免费额度
            used: 0,
          })
          console.log('[SignIn] New user created')
        }
        return true
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      if (token.email) {
        const storedUser = userStore.get(token.email as string)
        if (storedUser) {
          token.quota = storedUser.quota
          token.used = storedUser.used
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        ;(session.user as any).quota = token.quota
        ;(session.user as any).used = token.used
      }
      return session
    }
  },

  pages: {
    signIn: '/',
    error: '/auth/error'
  },

  debug: process.env.NODE_ENV === 'development'
}
