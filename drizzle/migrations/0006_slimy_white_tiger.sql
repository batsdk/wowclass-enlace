ALTER TABLE "student_attentions" ADD COLUMN "term1_attention" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "student_attentions" ADD COLUMN "term2_attention" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "student_attentions" ADD COLUMN "term3_attention" integer DEFAULT 0;--> statement-breakpoint
CREATE UNIQUE INDEX "student_year_unique" ON "student_attentions" USING btree ("student_id","year");--> statement-breakpoint
ALTER TABLE "student_attentions" DROP COLUMN "term";--> statement-breakpoint
ALTER TABLE "student_attentions" DROP COLUMN "attention";