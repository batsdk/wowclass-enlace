import { pgTable, text, timestamp, pgEnum, uuid, primaryKey, boolean, integer, uniqueIndex, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['teacher', 'student']);

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: roleEnum('role').notNull(),
  name: text('name'),
  email: text('email').unique(),
  username: text('username').unique(),
  password: text('password'), // Hashed
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  institutes: many(institutes),
}));

export const institutes = pgTable('institutes', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url'), // Optional
  address: text('address'), // Optional
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Teacher who added it
  createdAt: timestamp('created_at').defaultNow(),
});

export const institutesRelations = relations(institutes, ({ one }) => ({
  creator: one(users, { fields: [institutes.createdBy], references: [users.id] }),
}));

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  instituteId: uuid('institute_id').references(() => institutes.id, { onDelete: 'cascade' }).notNull(), // Foreign key to institute
  name: text('name').notNull(),
  description: text('description'), // Optional
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Teacher
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  school: text('school').notNull(),
  email: text('email').unique(),
  password: text('password').notNull(), // Hashed on server
  image: text('image'), // Cloudinary URL
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Teacher
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentClasses = pgTable('student_classes', {
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.studentId, table.classId] }),
}));


export const studentClassesRelations = relations(studentClasses, ({ one }) => ({
  student: one(students, { fields: [studentClasses.studentId], references: [students.id] }),
  class: one(classes, { fields: [studentClasses.classId], references: [classes.id] }),
}));

export const terms = pgEnum('term', ['1', '2', '3']);

export const paperTypes = pgTable('paper_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(), // e.g., 'M', 'P', or custom
  isGlobal: boolean('is_global').default(true), // Global or class-specific
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }), // Optional for class-specific
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const papers = pgTable('papers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  date: timestamp('date').defaultNow().notNull(), // Default to today
  term: terms('term').notNull(),
  typeId: uuid('type_id').references(() => paperTypes.id, { onDelete: 'set null' }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paperClasses = pgTable('paper_classes', {
  paperId: uuid('paper_id').references(() => papers.id, { onDelete: 'cascade' }).notNull(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.paperId, table.classId] }),
}));

export const paperTypesRelations = relations(paperTypes, ({ one }) => ({
  class: one(classes, { fields: [paperTypes.classId], references: [classes.id] }),
  creator: one(users, { fields: [paperTypes.createdBy], references: [users.id] }),
}));

export const paperClassesRelations = relations(paperClasses, ({ one }) => ({
  paper: one(papers, { fields: [paperClasses.paperId], references: [papers.id] }),
  class: one(classes, { fields: [paperClasses.classId], references: [classes.id] }),
}));



// Student Attention

export const studentAttentions = pgTable('student_attentions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  year: text('year').notNull(),
  term1Attention: integer('term1_attention').default(0),
  term2Attention: integer('term2_attention').default(0),
  term3Attention: integer('term3_attention').default(0),
  note: text('note'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  unique: uniqueIndex('student_year_unique').on(table.studentId, table.year),
}));

export const studentAttentionsRelations = relations(studentAttentions, ({ one }) => ({
  student: one(students, { fields: [studentAttentions.studentId], references: [students.id] }),
  creator: one(users, { fields: [studentAttentions.createdBy], references: [users.id] }),
}));

// Student Attendance
export const studentAttendance = pgTable('student_attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').notNull(),
  attended: boolean('attended').default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  unique: uniqueIndex('student_attendance_unique').on(table.studentId, table.classId, table.date),
}));

export const studentAttendanceRelations = relations(studentAttendance, ({ one }) => ({
  student: one(students, { fields: [studentAttendance.studentId], references: [students.id] }),
  class: one(classes, { fields: [studentAttendance.classId], references: [classes.id] }),
  creator: one(users, { fields: [studentAttendance.createdBy], references: [users.id] }),
}));

// Student Marks
export const studentMarks = pgTable('student_marks', {
  id: uuid('id').defaultRandom().primaryKey(),
  paperId: uuid('paper_id').references(() => papers.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  marks: integer('marks').default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  unique: uniqueIndex('student_paper_unique').on(table.paperId, table.studentId),
}));

export const studentMarksRelations = relations(studentMarks, ({ one }) => ({
  paper: one(papers, { fields: [studentMarks.paperId], references: [papers.id] }),
  student: one(students, { fields: [studentMarks.studentId], references: [students.id] }),
  creator: one(users, { fields: [studentMarks.createdBy], references: [users.id] }),
}));


// Class Recordings
export const recordings = pgTable('recordings', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  link: text('link').notNull(),
  expiryDate: timestamp('expiry_date').notNull(), // Set to date + expiry days
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Student Metrics
export const ratingEnum = pgEnum('rating', ['good', 'avg', 'bad']);

export const metricEnum = pgEnum('metric', ['attendance', 'attention', 'note_complete', 'home_work', 'short_note', 'interest_subject']);

export const studentProgressMetrics = pgTable('student_progress_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  year: text('year').notNull(),
  term: terms('term').notNull(),
  metric: metricEnum('metric').notNull(),
  rating: ratingEnum('rating'),
  marks: integer('marks').default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  unique: uniqueIndex('student_metric_unique').on(table.studentId, table.year, table.term, table.metric),
}));

export const studentProgressMetricsRelations = relations(studentProgressMetrics, ({ one }) => ({
  student: one(students, { fields: [studentProgressMetrics.studentId], references: [students.id] }),
  creator: one(users, { fields: [studentProgressMetrics.createdBy], references: [users.id] }),
}));

// Relations
export const studentsRelations = relations(students, ({ many }) => ({
  classes: many(studentClasses),
  attentions: many(studentAttentions),
  attendance: many(studentAttendance),
  marks: many(studentMarks),
  progressMetrics: many(studentProgressMetrics),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  institute: one(institutes, { fields: [classes.instituteId], references: [institutes.id] }),
  creator: one(users, { fields: [classes.createdBy], references: [users.id] }),
  students: many(studentClasses),
  papers: many(paperClasses),
  attendance: many(studentAttendance),
  recordings: many(recordings),
}));

export const papersRelations = relations(papers, ({ one, many }) => ({
  type: one(paperTypes, { fields: [papers.typeId], references: [paperTypes.id] }),
  creator: one(users, { fields: [papers.createdBy], references: [users.id] }),
  classes: many(paperClasses),
  marks: many(studentMarks),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  class: one(classes, { fields: [recordings.classId], references: [classes.id] }),
  creator: one(users, { fields: [recordings.createdBy], references: [users.id] }),
}));

// Online MCQ Exams
export const mcqStatusEnum = pgEnum('mcq_status', ['draft', 'published', 'archived']);
export const attemptStatusEnum = pgEnum('attempt_status', ['in_progress', 'completed', 'timed_out']);

export const mcqExams = pgTable('mcq_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // In minutes
  status: mcqStatusEnum('status').default('draft').notNull(),
  paperId: uuid('paper_id').references(() => papers.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mcqExamsRelations = relations(mcqExams, ({ one, many }) => ({
  class: one(classes, { fields: [mcqExams.classId], references: [classes.id] }),
  paper: one(papers, { fields: [mcqExams.paperId], references: [papers.id] }),
  creator: one(users, { fields: [mcqExams.createdBy], references: [users.id] }),
  questions: many(mcqQuestions),
  attempts: many(mcqAttempts),
}));

export const mcqQuestions = pgTable('mcq_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => mcqExams.id, { onDelete: 'cascade' }).notNull(),
  questionText: text('question_text').notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mcqQuestionsRelations = relations(mcqQuestions, ({ one, many }) => ({
  exam: one(mcqExams, { fields: [mcqQuestions.examId], references: [mcqExams.id] }),
  options: many(mcqOptions),
}));

export const mcqOptions = pgTable('mcq_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => mcqQuestions.id, { onDelete: 'cascade' }).notNull(),
  optionText: text('option_text').notNull(),
  isCorrect: boolean('is_correct').default(false).notNull(),
  order: integer('order').notNull(),
});

export const mcqOptionsRelations = relations(mcqOptions, ({ one }) => ({
  question: one(mcqQuestions, { fields: [mcqOptions.questionId], references: [mcqQuestions.id] }),
}));

export const mcqAttempts = pgTable('mcq_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => mcqExams.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  score: integer('score'), // Calculated upon submission or timeout
  status: attemptStatusEnum('status').default('in_progress').notNull(),
});

export const mcqAttemptsRelations = relations(mcqAttempts, ({ one, many }) => ({
  exam: one(mcqExams, { fields: [mcqAttempts.examId], references: [mcqExams.id] }),
  student: one(students, { fields: [mcqAttempts.studentId], references: [students.id] }),
  answers: many(mcqStudentAnswers),
}));

export const mcqStudentAnswers = pgTable('mcq_student_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => mcqAttempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => mcqQuestions.id, { onDelete: 'cascade' }).notNull(),
  optionId: uuid('option_id').references(() => mcqOptions.id, { onDelete: 'cascade' }).notNull(),
});

export const mcqStudentAnswersRelations = relations(mcqStudentAnswers, ({ one }) => ({
  attempt: one(mcqAttempts, { fields: [mcqStudentAnswers.attemptId], references: [mcqAttempts.id] }),
  question: one(mcqQuestions, { fields: [mcqStudentAnswers.questionId], references: [mcqQuestions.id] }),
  option: one(mcqOptions, { fields: [mcqStudentAnswers.optionId], references: [mcqOptions.id] }),
}));
