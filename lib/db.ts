import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema'

const queryClient = postgres(process.env.DATABASE_URL!,{
  ssl: 'require',
});
export const db = drizzle(queryClient, { schema });