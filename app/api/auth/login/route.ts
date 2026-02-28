// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import * as schema from '@/db/schema';
//  import { eq } from 'drizzle-orm';
// import bcrypt from 'bcrypt';
// import { generateToken, setTokenCookie } from '@/lib/jwt';

// export async function POST(req: NextRequest) {
//   const body = await req.json();
//   const { identifier, password, role } = body;

//   if (!identifier || !password || (role !== 'teacher' && role !== 'student')) {
//     return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
//   }

//   let user;
//   if (role === 'teacher') {
//     [user] = await db.select().from(schema.users).where(eq(schema.users.email, identifier)).limit(1);
//   } else {
//     [user] = await db.select().from(schema.students).where(eq(schema.students.username, identifier)).limit(1);
//   }

//   console.log(user);

//   if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
//     return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
//   }

//   const token = generateToken({ id: user.id, role: user.role, name: user.name as string, email: user.email as string });

//   const res = NextResponse.json({ success: true });
//   res.cookies.set('token', token, {
//     httpOnly: true,
//     path: '/',
//     // Add other options as needed (e.g., secure, sameSite, maxAge)
//   });
//   return res;
// }

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import bcrypt from 'bcrypt';
import { generateToken } from '@/lib/jwt';

// Define token payload type with optional fields for both roles
export type TokenPayload = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type role = 'teacher' | 'student';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { identifier, password, role } = body;

  if (!identifier || !password || (role !== 'teacher' && role !== 'student')) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  let user: { id: string; password: string } | {
    id: string;
    password: string | null;
    email: string | null;
    role: role;
    name: string | null;
  } | {
    id: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null = null;

  if (role === 'teacher') {
    const [teacher] = await db
      .select({
        id: schema.users.id,
        password: schema.users.password,
        email: schema.users.email,
        role: schema.users.role,
        name: schema.users.name,
      })
      .from(schema.users)
      .where(sql`${schema.users.email} = ${identifier}`)
      .limit(1);
    user = teacher || null;
  } else {
    const [student] = await db
      .select({
        id: schema.students.id,
        password: schema.students.password,
        username: schema.students.username,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
      })
      .from(schema.students)
      .where(sql`${schema.students.username} = ${identifier}`)
      .limit(1);
    user = student || null;
  }

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  console.log(user);

  // Construct token payload based on role
  let tokenPayload: TokenPayload;
  if (role === 'teacher') {
    tokenPayload = {
      id: user.id,
      role: 'teacher' as role,
      name: (user as typeof schema.users.$inferSelect).name || undefined,
      email: (user as typeof schema.users.$inferSelect).email || undefined,
    };
  } else {
    tokenPayload = {
      id: user.id,
      role: 'student' as role,
      username: (user as typeof schema.students.$inferSelect).username,
      firstName: (user as typeof schema.students.$inferSelect).firstName,
      lastName: (user as typeof schema.students.$inferSelect).lastName,
    };
  }

  const token = generateToken(tokenPayload);
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', token, {
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return res;
}