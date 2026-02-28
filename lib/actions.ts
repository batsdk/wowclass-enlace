'use server';

import { z } from 'zod';
import { sendNotificationEmail } from './mail';
import * as schema from '@/db/schema';
import { db } from './db';
import { verifyToken } from './jwt';
import { cookies } from 'next/headers';
import { and, eq, gt, lt, or, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { addRecordingSchema, addStudentSchema, markAttendanceSchema, updateMarksSchema, updateMetricSchema } from './schemas';
import { eachWeekOfInterval } from 'date-fns';
import { v2 as cloudinary } from 'cloudinary'
import { redirect } from 'next/navigation';

const addInstituteSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  imageUrl: z.string().optional(),
  address: z.string().optional(),
});

export async function addInstitute(data: z.infer<typeof addInstituteSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can add institutes');
  }

  const parsed = addInstituteSchema.parse(data);

  await db.insert(schema.institutes).values({
    ...parsed,
    createdBy: user.id,
  });

  return { success: true, message: 'Institute added successfully' };
}

export async function getInstitutes() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can view institutes');
  }

  return db.select().from(schema.institutes).where(eq(schema.institutes.createdBy, user.id));
}

export async function updateInstitutes(updates: Array<{ id: string; name: string; imageUrl?: string; address?: string }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can update institutes');
  }

  for (const update of updates) {
    await db.update(schema.institutes).set(update).where(eq(schema.institutes.id, update.id));
  }

  return { success: true, message: 'Institutes updated successfully' };
}

// Helper to get user from token
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return { id: decoded.sub, role: decoded.role } as const;
}

// ... existing code ...

const addClassSchema = z.object({
  instituteId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});

// Get classes for the teacher's institutes
export async function getClasses() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can view classes');
  }

  return db.select({
    id: schema.classes.id,
    name: schema.classes.name,
    description: schema.classes.description,
    instituteId: schema.classes.instituteId,
    createdBy: schema.classes.createdBy,
    createdAt: schema.classes.createdAt,
  }).from(schema.classes).where(eq(schema.classes.createdBy, user.id));
}
// Add class
export async function addClass(data: z.infer<typeof addClassSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can add classes');
  }

  const parsed = addClassSchema.parse(data);

  // Check if teacher owns the institute
  const [institute] = await db.select().from(schema.institutes).where(eq(schema.institutes.id, parsed.instituteId));
  if (!institute || institute.createdBy !== user.id) {
    throw new Error('Unauthorized: Invalid institute');
  }

  await db.insert(schema.classes).values({
    ...parsed,
    createdBy: user.id,
  });

  return { success: true, message: 'Class added successfully' };
}

// Batch update classes
export async function updateClasses(updates: Array<{ id: string; name: string; description?: string }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can update classes');
  }

  for (const update of updates) {
    // Check ownership
    const [classItem] = await db.select().from(schema.classes).where(eq(schema.classes.id, update.id));
    if (!classItem || classItem.createdBy !== user.id) {
      throw new Error('Unauthorized: Invalid class');
    }

    await db.update(schema.classes).set(update).where(eq(schema.classes.id, update.id));
  }

  return { success: true, message: 'Classes updated successfully' };
}

export async function getTeacherInstitutes() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can view institutes');
  }

  console.log("Getting classes for the teacher")
  return db.select({ id: schema.institutes.id, name: schema.institutes.name }).from(schema.institutes).where(eq(schema.institutes.createdBy, user.id));
}

export async function addStudent(data: z.infer<typeof addStudentSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can add students');
  }

  const parsed = addStudentSchema.parse(data);

  // Check username unique
  const [existing] = await db.select().from(schema.students).where(eq(schema.students.username, parsed.username)).limit(1);
  if (existing) {
    throw new Error('Username already in use');
  }

  const hashedPassword = await bcrypt.hash(parsed.password, 10);

  await db.insert(schema.students).values({
    username: parsed.username,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    school: parsed.school,
    email: parsed.email,
    password: hashedPassword,
    createdBy: user.id,
  });

  return { success: true, message: 'Student added successfully' };
}

/**
 * Get students with optional filtering by institute, class, and username.
 * Always filters by the current teacher's students.
 */
export async function getStudents({
  instituteId,
  classId,
  username,
}: {
  instituteId?: string;
  classId?: string;
  username?: string;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can view students');
  }

  const { and, like, eq } = await import('drizzle-orm');
  // Build up conditions
  const conditions = [eq(schema.students.createdBy, user.id)];
  if (username) {
    conditions.push(like(schema.students.username, `%${username}%`));
  }

  // If filtering by class or institute, join tables and select only student fields
  if (classId || instituteId) {
    const joinConds = [eq(schema.studentClasses.studentId, schema.students.id)];
    if (classId) joinConds.push(eq(schema.studentClasses.classId, classId));
    let classJoinCond = eq(schema.studentClasses.classId, schema.classes.id);
    let instCond = undefined;
    if (instituteId) instCond = eq(schema.classes.instituteId, instituteId);

    const result = await db
      .select({
        id: schema.students.id,
        username: schema.students.username,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        school: schema.students.school,
        password: schema.students.password,
        createdBy: schema.students.createdBy,
        createdAt: schema.students.createdAt,
      })
      .from(schema.students)
      .innerJoin(schema.studentClasses, and(...joinConds))
      .innerJoin(schema.classes, classJoinCond)
      .where(and(...conditions, ...(instCond ? [instCond] : [])));
    return result;
  } else {
    // No joins needed
    return db
      .select({
        id: schema.students.id,
        username: schema.students.username,
        firstName: schema.students.firstName,
        lastName: schema.students.lastName,
        school: schema.students.school,
        password: schema.students.password,
        createdBy: schema.students.createdBy,
        createdAt: schema.students.createdAt,
      })
      .from(schema.students)
      .where(and(...conditions));
  }
}

export async function getStudentClasses(studentId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Check student ownership
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student || student.createdBy !== user.id) {
    throw new Error('Unauthorized: Invalid student');
  }

  return db.select({ classId: schema.studentClasses.classId, className: schema.classes.name }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .where(eq(schema.studentClasses.studentId, studentId));
}

export async function getStudentClassesForExams(instituteId?: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') {
    throw new Error('Unauthorized');
  }

  const conditions = [eq(schema.studentClasses.studentId, user.id)];
  if (instituteId) {
    conditions.push(eq(schema.classes.instituteId, instituteId));
  }

  return db.select({
    id: schema.classes.id,
    name: schema.classes.name,
    instituteId: schema.classes.instituteId,
  }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .where(and(...conditions));
}

export async function getStudentInstitutes() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') {
    throw new Error('Unauthorized');
  }

  return db.selectDistinct({
    id: schema.institutes.id,
    name: schema.institutes.name,
  }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .innerJoin(schema.institutes, eq(schema.classes.instituteId, schema.institutes.id))
    .where(eq(schema.studentClasses.studentId, user.id));
}

export async function addStudentToClass(studentId: string, classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Check ownership and if not already added
  // (simplified; add checks as needed)

  await db.insert(schema.studentClasses).values({ studentId, classId }).onConflictDoNothing();

  return { success: true };
}

export async function removeStudentFromClass(studentId: string, classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Check ownership

  await db.delete(schema.studentClasses).where(and(eq(schema.studentClasses.studentId, studentId), eq(schema.studentClasses.classId, classId)));

  return { success: true };
}

export async function getClassesForInstitute(instituteId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can access classes');
  }

  // Check if teacher owns the institute
  const [institute] = await db.select().from(schema.institutes).where(eq(schema.institutes.id, instituteId));
  if (!institute || institute.createdBy !== user.id) {
    throw new Error('Unauthorized: Invalid institute');
  }

  return db.select({ id: schema.classes.id, name: schema.classes.name }).from(schema.classes).where(eq(schema.classes.instituteId, instituteId));
}

const updateStudentSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  school: z.string().min(1).optional(),
});

export async function updateStudents(updates: Array<z.infer<typeof updateStudentSchema>>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized: Only teachers can update students');
  }

  for (const update of updates) {
    const parsed = updateStudentSchema.parse(update);

    // Check ownership
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, parsed.id));
    if (!student || student.createdBy !== user.id) {
      throw new Error('Unauthorized: Invalid student');
    }

    await db.update(schema.students).set(parsed).where(eq(schema.students.id, parsed.id));
  }

  return { success: true, message: 'Students updated successfully' };
}

const addPaperTypeSchema = z.object({
  name: z.string().min(1),
  isGlobal: z.boolean(),
  classId: z.string().uuid().optional(),
});

export async function addPaperType(data: z.infer<typeof addPaperTypeSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  await db.insert(schema.paperTypes).values({
    ...data,
    createdBy: user.id,
  });

  return { success: true };
}

export async function getPaperTypes({ classId }: { classId?: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  let query;
  if (classId) {
    query = db.select().from(schema.paperTypes).where(
      or(
        eq(schema.paperTypes.isGlobal, true),
        eq(schema.paperTypes.classId, classId)
      )
    );
  } else {
    query = db.select().from(schema.paperTypes).where(
      eq(schema.paperTypes.isGlobal, true)
    );
  }

  return query;
}

const addPaperSchema = z.object({
  name: z.string().min(1),
  date: z.date().optional(),
  term: z.enum(['1', '2', '3']),
  typeId: z.string().uuid(),
  classIds: z.array(z.string().uuid()),
});

export async function addPaper(data: z.infer<typeof addPaperSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const parsed = addPaperSchema.parse(data);
  const date = parsed.date || new Date();

  const [paper] = await db.insert(schema.papers).values({
    name: parsed.name,
    date,
    term: parsed.term,
    typeId: parsed.typeId,
    createdBy: user.id,
  }).returning();

  for (const classId of parsed.classIds) {
    await db.insert(schema.paperClasses).values({ paperId: paper.id, classId });
  }

  return { success: true };
}

export async function getPapers({ instituteId, classId, term }: { instituteId?: string; classId?: string; term?: '1' | '2' | '3' }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const { and, eq } = await import('drizzle-orm');
  const paperSelect = {
    id: schema.papers.id,
    name: schema.papers.name,
    date: schema.papers.date,
    term: schema.papers.term,
    typeId: schema.papers.typeId,
    createdBy: schema.papers.createdBy,
    createdAt: schema.papers.createdAt,
  };

  // Build up conditions
  const conditions = [eq(schema.papers.createdBy, user.id)];
  if (term) {
    conditions.push(eq(schema.papers.term, term));
  }

  let query;
  let joined = false;
  if (instituteId || classId) {
    query = db
      .select({ papers: paperSelect })
      .from(schema.papers)
      .innerJoin(schema.paperClasses, eq(schema.papers.id, schema.paperClasses.paperId))
      .innerJoin(schema.classes, eq(schema.paperClasses.classId, schema.classes.id));
    joined = true;
    if (instituteId) {
      conditions.push(eq(schema.classes.instituteId, instituteId));
    }
    if (classId) {
      conditions.push(eq(schema.classes.id, classId));
    }
  } else {
    query = db.select(paperSelect).from(schema.papers);
  }

  const result = await query.where(and(...conditions));
  if (joined) {
    // When joined, result is array of { papers, paper_classes, classes }
    return result.map((row: any) => row.papers);
  } else {
    // When not joined, result is array of papers
    return result;
  }
}

export async function updatePapers(updates: Array<{ id: string; name: string; date: Date }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    const [paper] = await db.select().from(schema.papers).where(eq(schema.papers.id, update.id));
    if (!paper || paper.createdBy !== user.id) {
      throw new Error('Unauthorized: Invalid paper');
    }

    await db.update(schema.papers).set(update).where(eq(schema.papers.id, update.id));
  }

  return { success: true };
}

export async function getPaperClasses(paperId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const [paper] = await db.select().from(schema.papers).where(eq(schema.papers.id, paperId));
  if (!paper || paper.createdBy !== user.id) {
    throw new Error('Unauthorized: Invalid paper');
  }

  return db.select({ classId: schema.paperClasses.classId, className: schema.classes.name }).from(schema.paperClasses)
    .innerJoin(schema.classes, eq(schema.paperClasses.classId, schema.classes.id))
    .where(eq(schema.paperClasses.paperId, paperId));
}

export async function addPaperToClass(paperId: string, classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Check ownership (paper and class)

  await db.insert(schema.paperClasses).values({ paperId, classId }).onConflictDoNothing();

  return { success: true };
}

export async function removePaperFromClass(paperId: string, classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Check ownership

  await db.delete(schema.paperClasses).where(and(eq(schema.paperClasses.paperId, paperId), eq(schema.paperClasses.classId, classId)));

  return { success: true };
}

// Attention
export async function getAttentions({ instituteId, classId }: { instituteId?: string; classId?: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  if (!instituteId && !classId) {
    return [];
  }

  let query = db.select({
    id: schema.studentAttentions.id,
    studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
    year: schema.studentAttentions.year,
    term1: schema.studentAttentions.term1Attention,
    term2: schema.studentAttentions.term2Attention,
    term3: schema.studentAttentions.term3Attention,
    note: schema.studentAttentions.note,
  }).from(schema.studentAttentions)
    .innerJoin(schema.students, eq(schema.studentAttentions.studentId, schema.students.id));

  if (classId) {
    return query
      .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
      .where(eq(schema.studentClasses.classId, classId));
  } else if (instituteId) {
    return query
      .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
      .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
      .where(eq(schema.classes.instituteId, instituteId));
  }

  return query;
}

export async function addAttention(data: { studentId: string; year: string; term: '1' | '2' | '3'; attention: number; note?: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const termField = `term${data.term}Attention` as 'term1Attention' | 'term2Attention' | 'term3Attention';
  // Try to update first
  const updateResult = await db.update(schema.studentAttentions)
    .set({
      [termField]: data.attention,
      note: data.note,
    })
    .where(and(eq(schema.studentAttentions.studentId, data.studentId), eq(schema.studentAttentions.year, data.year)));

  // If no rows were updated, insert
  if ((updateResult as any).rowCount === 0 || (Array.isArray(updateResult) && updateResult.length === 0)) {
    await db.insert(schema.studentAttentions).values({
      studentId: data.studentId,
      year: data.year,
      [termField]: data.attention,
      note: data.note,
      createdBy: user.id,
    });
  }

  return { success: true };
}

export async function updateAttentions(updates: Array<{ id: string; year: string; term1: number; term2: number; term3: number; note?: string }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    await db.update(schema.studentAttentions).set({
      term1Attention: update.term1,
      term2Attention: update.term2,
      term3Attention: update.term3,
      note: update.note,
      year: update.year,
    }).where(eq(schema.studentAttentions.id, update.id));
  }

  return { success: true };
}

export async function getStudentsForClass(classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  return db.select({ id: schema.students.id, name: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}` }).from(schema.students)
    .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
    .where(eq(schema.studentClasses.classId, classId));
}

// Attendance
// export async function getAttendance({ classId, date }: { classId: string; date: Date }) {
//   const user = await getCurrentUser();
//   if (!user || user.role !== 'teacher') {
//     throw new Error('Unauthorized');
//   }

//   // Get students in the class with attendance for the date (left join for default false)
//   return db.select({
//     studentId: schema.students.id,
//     studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
//     attended: schema.studentAttendance.attended,
//   }).from(schema.students)
//     .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
//     .leftJoin(schema.studentAttendance, and(eq(schema.studentAttendance.studentId, schema.students.id), eq(schema.studentAttendance.classId, classId), eq(schema.studentAttendance.date, date)))
//     .where(eq(schema.studentClasses.classId, classId));
// }

export async function getAttendance({ classId, date }: { classId: string; date: Date }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  return db.select({
    studentId: schema.students.id,
    studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
    attended: sql`COALESCE(${schema.studentAttendance.attended}, false)`,
  }).from(schema.students)
    .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
    .leftJoin(schema.studentAttendance, and(eq(schema.studentAttendance.studentId, schema.students.id), eq(schema.studentAttendance.classId, classId), eq(schema.studentAttendance.date, date)))
    .where(eq(schema.studentClasses.classId, classId));
}

export async function markAttendance(updates: Array<z.infer<typeof markAttendanceSchema>>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    await db.insert(schema.studentAttendance).values({
      ...update,
      createdBy: user.id,
    }).onConflictDoUpdate({
      target: [schema.studentAttendance.studentId, schema.studentAttendance.classId, schema.studentAttendance.date],
      set: { attended: update.attended },
    });
  }

  return { success: true };
}

// Get all attendance records for a class and date
export async function getAttendanceRecords({ classId, date }: { classId: string; date: Date }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // Get all students in the class and their attendance for the date
  return db.select({
    studentId: schema.students.id,
    studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
    attended: schema.studentAttendance.attended,
    attendanceId: schema.studentAttendance.id,
  }).from(schema.students)
    .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
    .leftJoin(schema.studentAttendance, and(eq(schema.studentAttendance.studentId, schema.students.id), eq(schema.studentAttendance.classId, classId), eq(schema.studentAttendance.date, date)))
    .where(eq(schema.studentClasses.classId, classId));
}

// Batch update attendance records for a class and date
export async function updateAttendanceRecords(updates: Array<{ attendanceId: string, attended: boolean }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    await db.update(schema.studentAttendance).set({ attended: update.attended }).where(eq(schema.studentAttendance.id, update.attendanceId));
  }

  return { success: true };
}

// !! Student Marks
export async function getPapersForClass(classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const manualPapers = await db.select({
    id: schema.papers.id,
    name: schema.papers.name,
    date: schema.papers.date,
    term: schema.papers.term,
    isMcq: sql<boolean>`false`,
  }).from(schema.papers)
    .innerJoin(schema.paperClasses, eq(schema.papers.id, schema.paperClasses.paperId))
    .where(eq(schema.paperClasses.classId, classId));

  const mcqExams = await db.select({
    id: schema.mcqExams.id,
    name: schema.mcqExams.title,
    date: schema.mcqExams.createdAt,
    term: sql<string>`'MCQ'`,
    isMcq: sql<boolean>`true`,
  }).from(schema.mcqExams)
    .where(and(eq(schema.mcqExams.classId, classId), sql`${schema.mcqExams.paperId} IS NULL`));

  return [...manualPapers, ...mcqExams];
}

// export async function getMarksForPaper(paperId: string, classId: string) {
//   const user = await getCurrentUser();
//   if (!user || user.role !== 'teacher') {
//     throw new Error('Unauthorized');
//   }

//   return db.select({
//     studentId: schema.students.id,
//     studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
//     marks: schema.studentMarks.marks,
//   }).from(schema.students)
//     .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
//     .leftJoin(schema.studentMarks, and(eq(schema.studentMarks.studentId, schema.students.id), eq(schema.studentMarks.paperId, paperId)))
//     .where(eq(schema.studentClasses.classId, classId));
// }

export async function getMarksForPaper(id: string, classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  // 1. Check if it's a manual paper first
  const [paper] = await db.select().from(schema.papers).where(eq(schema.papers.id, id)).limit(1);

  if (paper) {
    const manualMarks = await db.select({
      studentId: schema.students.id,
      studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
      marks: sql`COALESCE(${schema.studentMarks.marks}, 0)`,
    }).from(schema.students)
      .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
      .leftJoin(schema.studentMarks, and(eq(schema.studentMarks.studentId, schema.students.id), eq(schema.studentMarks.paperId, id)))
      .where(eq(schema.studentClasses.classId, classId));

    // Check if there is an MCQ linked to this paper
    const [mcqExam] = await db.select().from(schema.mcqExams).where(eq(schema.mcqExams.paperId, id)).limit(1);

    if (mcqExam) {
      const mcqAttempts = await db.select({
        studentId: schema.mcqAttempts.studentId,
        score: schema.mcqAttempts.score,
      }).from(schema.mcqAttempts)
        .where(and(eq(schema.mcqAttempts.examId, mcqExam.id), eq(schema.mcqAttempts.status, 'completed')));

      const mcqMap = new Map(mcqAttempts.map(a => [a.studentId, a.score]));

      return manualMarks.map(m => ({
        ...m,
        marks: Number(m.marks) || mcqMap.get(m.studentId) || 0
      }));
    }

    return manualMarks;
  }

  // 2. If not a paper, check if it's a standalone MCQ exam
  const [mcqExam] = await db.select().from(schema.mcqExams).where(eq(schema.mcqExams.id, id)).limit(1);
  if (mcqExam) {
    const studentsInClass = await db.select({
      studentId: schema.students.id,
      studentName: sql`${schema.students.firstName} || ' ' || ${schema.students.lastName}`,
    }).from(schema.students)
      .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
      .where(eq(schema.studentClasses.classId, classId));

    const mcqAttempts = await db.select({
      studentId: schema.mcqAttempts.studentId,
      score: schema.mcqAttempts.score,
    }).from(schema.mcqAttempts)
      .where(and(eq(schema.mcqAttempts.examId, id), eq(schema.mcqAttempts.status, 'completed')));

    const mcqMap = new Map(mcqAttempts.map(a => [a.studentId, a.score]));

    return studentsInClass.map(s => ({
      studentId: s.studentId,
      studentName: s.studentName as string,
      marks: mcqMap.get(s.studentId) || 0
    }));
  }

  return [];
}

export async function updateMarks(updates: Array<z.infer<typeof updateMarksSchema>>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    await db.insert(schema.studentMarks).values({
      ...update,
      createdBy: user.id,
    }).onConflictDoUpdate({
      target: [schema.studentMarks.paperId, schema.studentMarks.studentId],
      set: { marks: update.marks },
    });
  }

  return { success: true };
}

export async function getRecordings({ instituteId, classId }: { instituteId?: string; classId?: string }) {
  const user = await getCurrentUser();
  // if (!user || user.role !== 'teacher') {
  //   throw new Error('Unauthorized');
  // }

  // if (!user || (user.role !== 'teacher' && !classId)) {
  //   throw new Error('Unauthorized');
  // }

  // Base conditions that always apply
  const baseConditions = [
    gt(schema.recordings.expiryDate, new Date()), // Not expired (gt = greater than)
  ];

  if(user!.role === 'teacher'){
    baseConditions.push(
      eq(schema.recordings.createdBy, user!.id)
    )
  }

  if (classId) {
    // If classId is provided, add it to conditions and query recordings directly
    const conditions = [...baseConditions, eq(schema.recordings.classId, classId)];

    return db
      .select()
      .from(schema.recordings)
      .where(and(...conditions));

  }
  // else if (instituteId) {
  //   // If only instituteId is provided, join with classes table
  //   const conditions = [
  //     ...baseConditions,
  //     eq(schema.classes.instituteId, instituteId)
  //   ];

  //   return db
  //     .select()
  //     .from(schema.recordings)
  //     .innerJoin(schema.classes, eq(schema.recordings.classId, schema.classes.id))
  //     .where(and(...conditions));

  // }
  else {
    // No filters provided, just return recordings for this teacher
    return db
      .select()
      .from(schema.recordings)
      .where(and(...baseConditions));
  }
}

export async function addRecording(data: z.infer<typeof addRecordingSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const parsed = addRecordingSchema.parse(data);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parsed.expiryDays);

  await db.insert(schema.recordings).values({
    ...parsed,
    expiryDate,
    createdBy: user.id,
  });

  const studentsToNotify = await db.select({
    email: schema.students.email,
  }).from(schema.students)
    .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
    .where(and(
      eq(schema.studentClasses.classId, parsed.classId),
      sql`${schema.students.email} IS NOT NULL`
    ));

  const emails = studentsToNotify.map(s => s.email).filter(Boolean) as string[];

  if (emails.length > 0) {
    const [classInfo] = await db.select({ name: schema.classes.name }).from(schema.classes).where(eq(schema.classes.id, parsed.classId)).limit(1);
    const className = classInfo?.name || 'your class';

    // Fire and forget email sending to avoid blocking response
    sendNotificationEmail({
      to: emails,
      subject: `New Recording Added: ${parsed.name}`,
      message: `A new recording titled "<strong>${parsed.name}</strong>" has been added to <strong>${className}</strong>. You can view it in your dashboard.`
    }).catch(console.error);
  }

  return { success: true };
}

export async function updateRecordings(updates: Array<{ id: string; name: string; link: string; expiryDate: Date }>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const update of updates) {
    await db.update(schema.recordings).set(update).where(eq(schema.recordings.id, update.id));
  }

  return { success: true };
}

export async function deleteRecording(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  await db.delete(schema.recordings).where(eq(schema.recordings.id, id));

  return { success: true };
}

export async function getStudentClassesAsStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') {
    throw new Error('Unauthorized');
  }

  return db.select({ classId: schema.studentClasses.classId, className: schema.classes.name }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .where(eq(schema.studentClasses.studentId, user.id));
}

export async function getRecordingsForClass(classId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') {
    throw new Error('Unauthorized');
  }

  return db.select().from(schema.recordings).where(and(
    eq(schema.recordings.classId, classId),
    gt(schema.recordings.expiryDate, new Date()) // Only active recordings
  ));
}

// Reports

// export async function getAttendanceForStudent(studentId: string) {
//   const user = await getCurrentUser();
//   if (!user || user.role !== 'teacher') {
//     throw new Error('Unauthorized');
//   }

//   return db.select({
//     date: schema.studentAttendance.date,
//     attended: schema.studentAttendance.attended,
//   }).from(schema.studentAttendance)
//     .innerJoin(schema.studentClasses, eq(schema.studentAttendance.classId, schema.studentClasses.classId))
//     .where(eq(schema.studentClasses.studentId, studentId));
// }

export async function getMarksForStudent(studentId: string, year: string) {
  const user = await getCurrentUser();

  const manualMarks = await db.select({
    paperName: schema.papers.name,
    term: schema.papers.term,
    marks: schema.studentMarks.marks,
    isMcq: sql<boolean>`false`,
  }).from(schema.studentMarks)
    .innerJoin(schema.papers, eq(schema.studentMarks.paperId, schema.papers.id))
    .innerJoin(schema.paperClasses, eq(schema.papers.id, schema.paperClasses.paperId))
    .innerJoin(schema.classes, eq(schema.paperClasses.classId, schema.classes.id))
    .innerJoin(schema.studentClasses, eq(schema.classes.id, schema.studentClasses.classId))
    .where(and(
      eq(schema.studentClasses.studentId, studentId),
      sql`EXTRACT(YEAR FROM ${schema.papers.date}) = ${year}`
    ));

  const mcqMarks = await db.select({
    paperName: sql<string>`COALESCE(${schema.mcqExams.title}, 'MCQ Exam')`,
    term: sql<string>`COALESCE(${schema.papers.term}::text, 'MCQ')`,
    marks: schema.mcqAttempts.score,
    isMcq: sql<boolean>`true`,
  })
    .from(schema.mcqAttempts)
    .innerJoin(schema.mcqExams, eq(schema.mcqAttempts.examId, schema.mcqExams.id))
    .leftJoin(schema.papers, eq(schema.mcqExams.paperId, schema.papers.id))
    .where(and(
      eq(schema.mcqAttempts.studentId, studentId),
      eq(schema.mcqAttempts.status, 'completed'),
      sql`EXTRACT(YEAR FROM ${schema.mcqAttempts.startTime}) = ${year}`
    ));

  return [...manualMarks, ...mcqMarks];
}

export async function getAttendanceForStudent(studentId: string, view: 'monthly' | 'weekly', year: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  const startDate = new Date(parseInt(year), 0, 1);
  const endDate = new Date(parseInt(year), 11, 31);

  if (view === 'monthly') {
    return db.select({
      date: sql`DATE_TRUNC('month', ${schema.studentAttendance.date})`,
      attended: sql`BOOL_OR(${schema.studentAttendance.attended})`,
    }).from(schema.studentAttendance)
      .innerJoin(schema.studentClasses, eq(schema.studentAttendance.classId, schema.studentClasses.classId))
      .where(and(
        eq(schema.studentClasses.studentId, studentId),
        sql`EXTRACT(YEAR FROM ${schema.studentAttendance.date}) = ${year}`
      ))
      .groupBy(sql`DATE_TRUNC('month', ${schema.studentAttendance.date})`);
  } else {
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    return db.select({
      date: sql`DATE_TRUNC('week', ${schema.studentAttendance.date})`,
      attended: sql`BOOL_OR(${schema.studentAttendance.attended})`,
    }).from(schema.studentAttendance)
      .innerJoin(schema.studentClasses, eq(schema.studentAttendance.classId, schema.studentClasses.classId))
      .where(and(
        eq(schema.studentClasses.studentId, studentId),
        sql`EXTRACT(YEAR FROM ${schema.studentAttendance.date}) = ${year}`
      ))
      .groupBy(sql`DATE_TRUNC('week', ${schema.studentAttendance.date})`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function bulkAddStudents(data: Array<z.infer<typeof addStudentSchema>>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') {
    throw new Error('Unauthorized');
  }

  for (const student of data) {
    const parsed = addStudentSchema.parse(student);
    const [existing] = await db.select().from(schema.students).where(eq(schema.students.username, parsed.username)).limit(1);
    if (existing) continue;

    const hashedPassword = await bcrypt.hash(parsed.password, 10);
    await db.insert(schema.students).values({
      username: parsed.username,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      school: parsed.school,
      email: parsed.email,
      password: hashedPassword,
      image: parsed.imageUrl ? String(parsed.imageUrl) : null,
      createdBy: user.id,
    }).onConflictDoNothing();
  }

  return { success: true };
}

export async function logout() {
  // Clear user data (e.g., token or session)
  localStorage.removeItem('authToken'); // Adjust based on your storage
  // Invalidate user context or session
  // Assuming useUser is tied to a context, this might need a custom hook update
  redirect('/auth/signin');
}

export async function getProfile(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'student' && user.id !== id) throw new Error('Unauthorized: Can only view own profile');

  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id)).limit(1);
  if (!student) throw new Error('Student not found');

  // Check if teacher owns the student
  if (user.role === 'teacher' && student.createdBy !== user.id) throw new Error('Unauthorized: Invalid student');

  const classes = await db.select({
    classId: schema.classes.id,
    className: schema.classes.name,
  }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .where(eq(schema.studentClasses.studentId, id));

  return { ...student, classes };
}

export async function updateStudent(data: z.infer<typeof updateStudentSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'student' && user.id !== data.id) {
    throw new Error('Unauthorized: Can only update own profile');
  }

  if (user.role === 'teacher') {
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, data.id)).limit(1);
    if (!student || student.createdBy !== user.id) throw new Error('Unauthorized: Invalid student');
  }

  const { id: _, ...updateData } = data;
  await db.update(schema.students).set(updateData).where(eq(schema.students.id, data.id));

  return { success: true };
}

export async function getStudentProgress(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'student' && user.id !== id) throw new Error('Unauthorized: Can only view own progress');

  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id)).limit(1);
  if (!student) throw new Error('Student not found');

  if (user.role === 'teacher' && student.createdBy !== user.id) throw new Error('Unauthorized: Invalid student');

  // Attendance percentage
  const attendanceRecords = await db
    .select({ attended: schema.studentAttendance.attended })
    .from(schema.studentAttendance)
    .where(eq(schema.studentAttendance.studentId, id));
  const attendancePercentage = attendanceRecords.length > 0
    ? (attendanceRecords.filter(r => r.attended).length / attendanceRecords.length) * 100
    : 0;

  // Attention scores
  const attentions = await db
    .select({
      year: schema.studentAttentions.year,
      term1: schema.studentAttentions.term1Attention,
      term2: schema.studentAttentions.term2Attention,
      term3: schema.studentAttentions.term3Attention,
    })
    .from(schema.studentAttentions)
    .where(eq(schema.studentAttentions.studentId, id));

  // Marks distribution
  const manualMarks = await db
    .select({
      paperName: schema.papers.name,
      term: schema.papers.term,
      marks: schema.studentMarks.marks,
      isMcq: sql<boolean>`false`,
    })
    .from(schema.studentMarks)
    .innerJoin(schema.papers, eq(schema.studentMarks.paperId, schema.papers.id))
    .where(eq(schema.studentMarks.studentId, id));

  const mcqMarks = await db.select({
    paperName: sql<string>`COALESCE(${schema.mcqExams.title}, 'MCQ Exam')`,
    term: sql<string>`COALESCE(${schema.papers.term}::text, 'MCQ')`,
    marks: schema.mcqAttempts.score,
    isMcq: sql<boolean>`true`,
  })
    .from(schema.mcqAttempts)
    .innerJoin(schema.mcqExams, eq(schema.mcqAttempts.examId, schema.mcqExams.id))
    .leftJoin(schema.papers, eq(schema.mcqExams.paperId, schema.papers.id))
    .where(and(
      eq(schema.mcqAttempts.studentId, id),
      eq(schema.mcqAttempts.status, 'completed')
    ));

  const marks = [...manualMarks, ...mcqMarks];

  // Classes
  const classes = await db
    .select({
      classId: schema.classes.id,
      className: schema.classes.name,
    })
    .from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .where(eq(schema.studentClasses.studentId, id));

  return {
    student,
    attendancePercentage,
    attentions,
    marks,
    classes,
  };
}

export async function getStudentMetrics(studentId: string, year: string, term: "1" | "2" | "3") {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  if (user.role === 'student' && user.id !== studentId) throw new Error('Unauthorized: Can only view own metrics');

  return db.select({
    metric: schema.studentProgressMetrics.metric,
    rating: schema.studentProgressMetrics.rating,
    marks: schema.studentProgressMetrics.marks,
  }).from(schema.studentProgressMetrics)
    .where(and(
      eq(schema.studentProgressMetrics.studentId, studentId),
      eq(schema.studentProgressMetrics.year, year),
      eq(schema.studentProgressMetrics.term, term)
    ));
}

export async function updateStudentMetric(data: z.infer<typeof updateMetricSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  const marks = data.rating === 'good' ? 5 : data.rating === 'avg' ? 3 : data.rating === 'bad' ? 2 : 0;

  await db.insert(schema.studentProgressMetrics).values({
    studentId: data.studentId,
    year: data.year,
    term: data.term,
    metric: data.metric,
    rating: data.rating,
    marks,
    createdBy: user.id,
  }).onConflictDoUpdate({
    target: [schema.studentProgressMetrics.studentId, schema.studentProgressMetrics.year, schema.studentProgressMetrics.term, schema.studentProgressMetrics.metric],
    set: { rating: data.rating, marks },
  });

  return { success: true };
}

export async function getEnrolledClasses(studentId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  // For students, only allow viewing their own classes
  if (user.role === 'student' && user.id !== studentId) throw new Error('Unauthorized: Can only view own classes');
  // For teachers, allow viewing any student's classes (add ownership check if needed)
  if (user.role === 'teacher') {
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId)).limit(1);
    if (!student || student.createdBy !== user.id) throw new Error('Unauthorized: Invalid student');
  }
  return db.select({
    classId: schema.classes.id,
    className: schema.classes.name,
    description: schema.classes.description,
    instituteName: schema.institutes.name,
  }).from(schema.studentClasses)
    .innerJoin(schema.classes, eq(schema.studentClasses.classId, schema.classes.id))
    .innerJoin(schema.institutes, eq(schema.classes.instituteId, schema.institutes.id))
    .where(eq(schema.studentClasses.studentId, studentId));
}