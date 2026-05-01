CREATE TABLE "generated_mcqs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "generated_mcqs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_id" integer NOT NULL,
	"question_id" varchar(128) NOT NULL,
	"learner_name" varchar(120),
	"subject" varchar(120) NOT NULL,
	"language" varchar(20) NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"syllabus_part" integer NOT NULL,
	"topic" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_attempt_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcq_attempt_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_id" integer NOT NULL,
	"learner_name" varchar(120) NOT NULL,
	"language" varchar(20) NOT NULL,
	"subjects" jsonb NOT NULL,
	"question_count" integer NOT NULL,
	"score" integer NOT NULL,
	"wrong" integer NOT NULL,
	"unanswered" integer NOT NULL,
	"accuracy_percent" integer NOT NULL,
	"avg_time_per_question" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_generation_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcq_generation_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"learner_name" varchar(120),
	"language" varchar(20) NOT NULL,
	"requested_subjects" jsonb NOT NULL,
	"requested_subject_count" integer NOT NULL,
	"requested_question_count" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"generated_question_count" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "generated_mcqs" ADD CONSTRAINT "generated_mcqs_request_id_mcq_generation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."mcq_generation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_attempt_results" ADD CONSTRAINT "mcq_attempt_results_request_id_mcq_generation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."mcq_generation_requests"("id") ON DELETE cascade ON UPDATE no action;