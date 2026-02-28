import 'dotenv/config';

import { db } from '@/lib/db';
import * as schema from '@/db/schema';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const hashedPass = await bcrypt.hash('teacherpass123', 10); // Change password as needed
  await db.insert(schema.users).values([
    {
      id: uuidv4(),
      role: 'teacher',
      name: 'Shemil Kaweesha',
      email: 'teacher@enlacelk.com',
      password: hashedPass,
    },
  ]);
  console.log('Initial teacher seeded. Use email and password to login.');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});