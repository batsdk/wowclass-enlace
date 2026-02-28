CREATE TYPE "public"."term" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TABLE "paper_classes" (
	"paper_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	CONSTRAINT "paper_classes_paper_id_class_id_pk" PRIMARY KEY("paper_id","class_id")
);
--> statement-breakpoint
CREATE TABLE "paper_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_global" boolean DEFAULT true,
	"class_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"term" "term" NOT NULL,
	"type_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "paper_classes" ADD CONSTRAINT "paper_classes_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_classes" ADD CONSTRAINT "paper_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_types" ADD CONSTRAINT "paper_types_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_types" ADD CONSTRAINT "paper_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_type_id_paper_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."paper_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;