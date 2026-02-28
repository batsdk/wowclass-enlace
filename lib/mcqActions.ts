'use server';

import { db } from './db';
import * as schema from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from './actions';
import { z } from 'zod';
import { sendNotificationEmail } from './mail';

// Schemas for validation
const createMcqExamSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.any(),
  paperId: z.string().uuid().optional(),
});

const addQuestionSchema = z.object({
  examId: z.string().uuid(),
  questionText: z.string().min(1),
  order: z.number(),
  options: z.array(z.object({
    optionText: z.string().min(1),
    isCorrect: z.boolean(),
    order: z.number(),
  })).length(4),
});

const addBatchQuestionsSchema = z.object({
  examId: z.string().uuid(),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    options: z.array(z.object({
      optionText: z.string().min(1),
      isCorrect: z.boolean(),
    })).length(4),
  })).min(1),
});

// Teacher Actions
export async function createMcqExam(data: z.infer<typeof createMcqExamSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  const [exam] = await db.insert(schema.mcqExams).values({
    ...data,
    duration: Number(data.duration) || 0, // Fallback for z.any()
    createdBy: user.id,
  }).returning();

  return exam;
}

export async function addMcqQuestion(data: z.infer<typeof addQuestionSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  return await db.transaction(async (tx) => {
    const [question] = await tx.insert(schema.mcqQuestions).values({
      examId: data.examId,
      questionText: data.questionText,
      order: data.order,
    }).returning();

    await tx.insert(schema.mcqOptions).values(
      data.options.map(opt => ({
        ...opt,
        questionId: question.id,
      }))
    );

    return question;
  });
}

export async function addMcqQuestions(data: z.infer<typeof addBatchQuestionsSchema>) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  return await db.transaction(async (tx) => {
    // Get current max order
    const [{ maxOrder }] = await tx.select({ maxOrder: sql<number>`COALESCE(MAX(${schema.mcqQuestions.order}), 0)` }).from(schema.mcqQuestions).where(eq(schema.mcqQuestions.examId, data.examId));

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const [question] = await tx.insert(schema.mcqQuestions).values({
        examId: data.examId,
        questionText: q.questionText,
        order: maxOrder + i + 1,
      }).returning();

      await tx.insert(schema.mcqOptions).values(
        q.options.map((opt, optIndex) => ({
          ...opt,
          questionId: question.id,
          order: optIndex,
        }))
      );
    }
    return { success: true };
  });
}

export async function publishMcqExam(examId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  const [exam] = await db.select().from(schema.mcqExams).where(eq(schema.mcqExams.id, examId)).limit(1);
  if (!exam) throw new Error('Exam not found');

  await db.update(schema.mcqExams)
    .set({ status: 'published' })
    .where(and(eq(schema.mcqExams.id, examId), eq(schema.mcqExams.createdBy, user.id)));

  if (exam.classId) {
    const studentsToNotify = await db.select({
      email: schema.students.email,
    }).from(schema.students)
      .innerJoin(schema.studentClasses, eq(schema.students.id, schema.studentClasses.studentId))
      .where(and(
        eq(schema.studentClasses.classId, exam.classId),
        sql`${schema.students.email} IS NOT NULL`
      ));

    const emails = studentsToNotify.map(s => s.email).filter(Boolean) as string[];

    if (emails.length > 0) {
      const [classInfo] = await db.select({ name: schema.classes.name }).from(schema.classes).where(eq(schema.classes.id, exam.classId)).limit(1);
      const className = classInfo?.name || 'your class';

      // Fire and forget
      sendNotificationEmail({
        to: emails,
        subject: `New MCQ Paper Published: ${exam.title}`,
        message: `A new MCQ paper titled "<strong>${exam.title}</strong>" has been published for <strong>${className}</strong>. You can now take the exam in your dashboard.`
      }).catch(console.error);
    }
  }

  return { success: true };
}

export async function getTeacherExams(classId?: string, paperId?: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'teacher') throw new Error('Unauthorized');

  const conditions = [eq(schema.mcqExams.createdBy, user.id)];
  if (classId) {
    conditions.push(eq(schema.mcqExams.classId, classId));
  }
  if (paperId) {
    conditions.push(eq(schema.mcqExams.paperId, paperId));
  }

  return db.select().from(schema.mcqExams).where(and(...conditions));
}

// Student Actions
export async function getPublishedExams(classIds: string | string[]) {
  const { inArray, and, eq } = await import('drizzle-orm');
  const rawIds = Array.isArray(classIds) ? classIds : [classIds];

  // Filter for valid UUIDs to prevent "invalid input syntax for type uuid"
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ids = rawIds.filter(id => uuidRegex.test(id));

  if (ids.length === 0) return [];

  return db.select()
    .from(schema.mcqExams)
    .where(and(
      inArray(schema.mcqExams.classId, ids),
      eq(schema.mcqExams.status, 'published')
    ));
}

export async function startMcqAttempt(examId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') throw new Error('Unauthorized');

  // Check for existing attempt
  const [existing] = await db.select()
    .from(schema.mcqAttempts)
    .where(and(
      eq(schema.mcqAttempts.examId, examId),
      eq(schema.mcqAttempts.studentId, user.id)
    ))
    .limit(1);

  if (existing) return existing;

  const [attempt] = await db.insert(schema.mcqAttempts).values({
    examId,
    studentId: user.id,
    status: 'in_progress',
  }).returning();

  return attempt;
}

export async function getExamQuestions(examId: string) {
  // For students, don't return isCorrect in this action
  // We'll calculate score on server
  const questions = await db.query.mcqQuestions.findMany({
    where: eq(schema.mcqQuestions.examId, examId),
    with: {
      options: {
        columns: {
          id: true,
          optionText: true,
          order: true,
        }
      }
    },
    orderBy: (questions, { asc }) => [asc(questions.order)],
  });

  return questions;
}

export async function submitMcqAttempt(attemptId: string, answers: { questionId: string, optionIds: string[] }[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'student') throw new Error('Unauthorized');

  return await db.transaction(async (tx) => {
    // 1. Get attempt and exam info
    const [attempt] = await tx.select()
      .from(schema.mcqAttempts)
      .where(eq(schema.mcqAttempts.id, attemptId))
      .limit(1);

    if (!attempt || attempt.status !== 'in_progress') throw new Error('Invalid attempt');

    const [exam] = await tx.select()
      .from(schema.mcqExams)
      .where(eq(schema.mcqExams.id, attempt.examId))
      .limit(1);

    // 2. Clear previous answers for this attempt (if any - though shouldn't happen)
    await tx.delete(schema.mcqStudentAnswers).where(eq(schema.mcqStudentAnswers.attemptId, attemptId));

    // 3. Save new answers
    const flattenedAnswers = answers.flatMap(ans =>
      ans.optionIds.map(optId => ({
        attemptId,
        questionId: ans.questionId,
        optionId: optId,
      }))
    );

    if (flattenedAnswers.length > 0) {
      await tx.insert(schema.mcqStudentAnswers).values(flattenedAnswers);
    }

    // 4. Calculate Score
    // Get all correct options for the exam
    const correctOptions = await tx.select({
      questionId: schema.mcqOptions.questionId,
      optionId: schema.mcqOptions.id,
    }).from(schema.mcqOptions)
      .innerJoin(schema.mcqQuestions, eq(schema.mcqOptions.questionId, schema.mcqQuestions.id))
      .where(and(eq(schema.mcqQuestions.examId, exam.id), eq(schema.mcqOptions.isCorrect, true)));

    // Group correct options by question for check
    const correctMap: Record<string, string[]> = {};
    correctOptions.forEach(opt => {
      if (!correctMap[opt.questionId]) correctMap[opt.questionId] = [];
      correctMap[opt.questionId].push(opt.optionId);
    });

    let score = 0;
    const totalQuestions = Object.keys(correctMap).length;

    answers.forEach(ans => {
      const correctIds = correctMap[ans.questionId] || [];
      // For multiple accepted answers, student must select ALL correct ones and ONLY correct ones?
      // Let's assume standard MCQ: student is correct if their selection matches exactly.
      const studentIds = ans.optionIds.sort().join(',');
      if (studentIds === correctIds.sort().join(',')) {
        score++;
      }
    });

    const finalScore = Math.round((score / totalQuestions) * 100);

    // 5. Update attempt status and score
    await tx.update(schema.mcqAttempts)
      .set({
        status: 'completed',
        score: finalScore,
        endTime: new Date(),
      })
      .where(eq(schema.mcqAttempts.id, attemptId));

    // 6. Optional: Sync to studentMarks for general reporting
    // We'll need to create a dummy paper or link it properly if we want it in existing reports
    // For now, let's keep it in mcq_attempts and we can update reports later

    return { success: true, score: finalScore };
  });
}
