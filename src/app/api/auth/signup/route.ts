import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signupSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = signupSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    const normalizedEmail = email.trim().toLowerCase();

    // ── 1. SUPABASE PRIMARY AUTH (Production & Cloud Mode) ──
    try {
      const { isSupabaseConfigured, supabaseAdmin } = await import('@/lib/supabase');
      if (isSupabaseConfigured()) {
        const { data: existingSbUser, error: checkError } = await supabaseAdmin.client
          .from('User')
          .select('id')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (checkError) {
          console.warn('Supabase check user notice:', checkError.message);
        }

        if (existingSbUser) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 409 }
          );
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const { data: newUser, error: insertError } = await supabaseAdmin.client
          .from('User')
          .insert({
            id: userId,
            name,
            email: normalizedEmail,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select('id, name, email')
          .single();

        if (insertError) {
          console.error('Supabase user creation error:', insertError);
          return NextResponse.json(
            { error: insertError.message || 'Failed to register account in database' },
            { status: 500 }
          );
        }

        // Mirror in local SQLite if writable (non-blocking, ignore errors if read-only filesystem on Vercel)
        try {
          await db.user.upsert({
            where: { email: normalizedEmail },
            create: {
              id: userId,
              name,
              email: normalizedEmail,
              password: hashedPassword,
            },
            update: {
              name,
              password: hashedPassword,
            },
          });
        } catch {
          // Ignored on serverless
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Account created successfully',
            user: newUser || { id: userId, name, email: normalizedEmail },
          },
          { status: 201 }
        );
      }
    } catch (sbErr) {
      console.warn('Supabase auth flow notice, attempting local db:', sbErr);
    }

    // ── 2. LOCAL PRISMA FALLBACK (Offline Local Development) ──
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
