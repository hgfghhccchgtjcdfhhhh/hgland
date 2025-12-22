import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  username: z.string().min(3).max(50),
  birthDate: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);

    const passwordHash = await hashPassword(data.password);

    const [user] = await db.insert(users).values({
      email: data.email,
      phone: data.phone,
      passwordHash,
      fullName: data.fullName,
      username: data.username,
      birthDate: data.birthDate,
    }).returning();

    const token = await createToken(user.id);
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
