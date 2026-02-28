import { db } from '@/lib/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getInstitutes(userId: string) {
  return db.select().from(schema.institutes).where(eq(schema.institutes.createdBy, userId)); // Fetch only teacher's institutes
}

export async function updateInstitutes(updates: { id: string; name: string; imageUrl?: string; address?: string }[]) {
  for (const update of updates) {
    await db.update(schema.institutes).set(update).where(eq(schema.institutes.id, update.id));
  }
}