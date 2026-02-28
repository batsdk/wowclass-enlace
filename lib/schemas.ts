import { z } from 'zod';

export const teacherLoginSchema = z.object({
  identifier: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.literal('teacher'),
});

export const studentLoginSchema = z.object({
  identifier: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.literal('student'),
});

export const addInstituteSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  imageUrl: z.string().optional(),
  address: z.string().optional(),
})

export const addClassSchema = z.object({
  instituteId: z.string().uuid({ message: 'Invalid institute' }),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
});

export const baseAddStudentSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  school: z.string().min(1, { message: 'School is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  image: z.any().optional(), // Original file for upload
  imageUrl: z.string().optional(), // Cloudinary URL after upload
});

export const addStudentSchema = (typeof window !== 'undefined')
  ? baseAddStudentSchema.extend({
    image: z.instanceof(File).optional(),
  })
  : baseAddStudentSchema.extend({
    image: z.any().optional(), // Fallback to any on server
  });

export const updateStudentSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  school: z.string().min(1).optional(),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  imageUrl: z.string().optional(),
});

export const addPaperSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  date: z.date().optional(),
  term: z.enum(['1', '2', '3'], { message: 'Invalid term' }),
  typeId: z.string().uuid({ message: 'Invalid type' }),
  classIds: z.array(z.string().uuid({ message: 'Invalid class ID' })),
});

export const addAttentionSchema = z.object({
  studentId: z.string().uuid(),
  year: z.string(),
  term: z.enum(['1', '2', '3']),
  attention: z.number(),
  note: z.string().optional(),
});

// Attendance
export const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  date: z.date(),
  attended: z.boolean(),
});

// Marks
export const updateMarksSchema = z.object({
  paperId: z.string().uuid(),
  studentId: z.string().uuid(),
  marks: z.number(),
});

// Recordings
export const addRecordingSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1),
  link: z.string().url(),
  expiryDays: z.number().min(1).default(3),
});

// Student metrics
export const updateMetricSchema = z.object({
  studentId: z.string().uuid(),
  year: z.string(),
  term: z.enum(['1', '2', '3']),
  metric: z.enum(['attendance', 'attention', 'note_complete', 'home_work', 'short_note', 'interest_subject']),
  rating: z.enum(['good', 'avg', 'bad']).nullable(),
});