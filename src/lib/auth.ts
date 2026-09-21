import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) return null;

        const { email, password } = validated.data;
        const normalizedEmail = email.trim().toLowerCase();

        let user: {
          id: string;
          name: string | null;
          email: string;
          password: string | null;
          image?: string | null;
        } | null = null;

        // 1. Check Supabase first (cloud primary)
        try {
          const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
          if (isSupabaseConfigured()) {
            const { data: sbUser, error: sbError } = await supabaseAdmin.client
              .from('User')
              .select('*')
              .ilike('email', normalizedEmail)
              .maybeSingle();

            if (!sbError && sbUser) {
              user = sbUser;
            }
          }
        } catch (sbErr) {
          console.warn('Supabase auth query notice:', sbErr);
        }

        // 2. Fallback to local Prisma db if not found in Supabase
        if (!user) {
          try {
            user = await db.user.findUnique({
              where: { email: normalizedEmail },
            });
          } catch (dbErr) {
            console.warn('Local db query notice:', dbErr);
          }
        }

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
});
