CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'completed', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."mcq_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "mcq_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"score" integer,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"status" "mcq_status" DEFAULT 'draft' NOT NULL,
	"paper_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcq_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcq_student_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"option_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_exam_id_mcq_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."mcq_exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_exams" ADD CONSTRAINT "mcq_exams_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_exams" ADD CONSTRAINT "mcq_exams_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_exams" ADD CONSTRAINT "mcq_exams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_options" ADD CONSTRAINT "mcq_options_question_id_mcq_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."mcq_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_exam_id_mcq_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."mcq_exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_student_answers" ADD CONSTRAINT "mcq_student_answers_attempt_id_mcq_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."mcq_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_student_answers" ADD CONSTRAINT "mcq_student_answers_question_id_mcq_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."mcq_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_student_answers" ADD CONSTRAINT "mcq_student_answers_option_id_mcq_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."mcq_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_email_unique" UNIQUE("email");