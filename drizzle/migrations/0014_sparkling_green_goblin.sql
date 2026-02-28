CREATE TYPE "public"."metric" AS ENUM('attendance', 'attention', 'note_complete', 'home_work', 'short_note', 'interest_subject');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('good', 'avg', 'bad');--> statement-breakpoint
CREATE TABLE "student_progress_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"year" text NOT NULL,
	"term" "term" NOT NULL,
	"metric" "metric" NOT NULL,
	"rating" "rating",
	"marks" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "student_progress_metrics" ADD CONSTRAINT "student_progress_metrics_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress_metrics" ADD CONSTRAINT "student_progress_metrics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_metric_unique" ON "student_progress_metrics" USING btree ("student_id","year","term","metric");