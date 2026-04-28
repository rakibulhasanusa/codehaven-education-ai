CREATE TYPE "public"."question_difficulty" AS ENUM('Basic', 'Medium', 'Hard');--> statement-breakpoint
CREATE TYPE "public"."question_language" AS ENUM('English', 'Bengali');--> statement-breakpoint
CREATE TYPE "public"."subject" AS ENUM('বাংলা ভাষা ও সাহিত্য', 'English Language and Literature', 'বাংলাদেশ বিষয়াবলি', 'আন্তর্জাতিক বিষয়াবলি', 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', 'সাধারণ বিজ্ঞান', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'গাণিতিক যুক্তি', 'মানসিক দক্ষতা', 'নৈতিকতা, মূল্যবোধ ও সুশাসন');--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_name" text NOT NULL,
	"language" "question_language" NOT NULL,
	"subjects" "subject"[] NOT NULL,
	"question_count" integer NOT NULL,
	"score" integer NOT NULL,
	"accuracy_percent" integer NOT NULL,
	"avg_time_per_question" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"subject" "subject" NOT NULL,
	"language" "question_language" NOT NULL,
	"difficulty" "question_difficulty" NOT NULL,
	"syllabus_part" integer,
	"topic" text NOT NULL,
	"question" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;