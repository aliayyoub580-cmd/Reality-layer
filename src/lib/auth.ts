import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validations';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
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

        let user = await db.user.findUnique({
          where: { email },
        });

        // If not found in local DB, check Supabase
        if (!user) {
          try {
            const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
            if (isSupabaseConfigured()) {
              const { data: sbUser } = await supabaseAdmin.client
                .from('User')
                .select('*')
                .eq('email', email)
                .maybeSingle();

              if (sbUser) {
                user = await db.user.upsert({
                  where: { email },
                  create: {
                    id: sbUser.id,
                    name: sbUser.name,
                    email: sbUser.email,
                    password: sbUser.password,
                  },
                  update: {
                    name: sbUser.name,
                    password: sbUser.password,
                  },
                });
              }
            }
          } catch (sbErr) {
            console.warn('Supabase auth query error:', sbErr);
          }
        }

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
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
