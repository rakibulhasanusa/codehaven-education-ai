import "dotenv/config";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    await sql.begin(async (tx) => {
      await tx`create table if not exists quiz_exams (
        id integer generated always as identity primary key,
        title varchar(180) not null,
        description text,
        instructions text,
        subject_id integer not null references subjects(id) on delete restrict,
        topic varchar(150),
        start_time timestamptz,
        end_time timestamptz,
        duration_minutes integer not null default 60,
        timing_mode varchar(24) not null default 'fixed_end_time',
        negative_marking real not null default 0,
        randomize_questions integer not null default 1,
        randomize_options integer not null default 1,
        fullscreen_required integer not null default 1,
        right_click_disabled integer not null default 1,
        copy_paste_disabled integer not null default 1,
        multiple_device_restricted integer not null default 1,
        is_published integer not null default 1,
        created_at timestamptz not null default now()
      )`;

      await tx`create table if not exists quiz_exam_questions (
        id integer generated always as identity primary key,
        exam_id integer not null references quiz_exams(id) on delete cascade,
        question_id integer references questions(id) on delete set null,
        question text not null,
        option_a text not null,
        option_b text not null,
        option_c text not null,
        option_d text not null,
        correct_answer varchar(1) not null,
        explanation text,
        subject_id integer references subjects(id) on delete set null,
        topic varchar(150),
        difficulty varchar(20),
        sort_order integer not null default 0,
        created_at timestamptz not null default now()
      )`;

      await tx`create table if not exists quiz_attempts (
        id varchar(80) primary key,
        exam_id integer not null references quiz_exams(id) on delete cascade,
        learner_name varchar(120) not null,
        device_id varchar(120),
        status varchar(24) not null default 'in_progress',
        started_at timestamptz not null default now(),
        submitted_at timestamptz,
        total_questions integer not null default 0,
        correct integer not null default 0,
        wrong integer not null default 0,
        skipped integer not null default 0,
        score integer not null default 0,
        accuracy_percent integer not null default 0,
        time_taken_seconds integer not null default 0,
        rank integer,
        ai_strong_topics text,
        ai_weak_topics text,
        ai_repeated_mistakes text,
        ai_suggestions text,
        created_at timestamptz not null default now()
      )`;

      await tx`create table if not exists quiz_attempt_answers (
        id integer generated always as identity primary key,
        attempt_id varchar(80) not null references quiz_attempts(id) on delete cascade,
        exam_question_id integer not null references quiz_exam_questions(id) on delete cascade,
        selected_answer varchar(1),
        is_marked_for_review integer not null default 0,
        time_spent_seconds integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;

      await tx`alter table quiz_exams
        alter column negative_marking type real
        using negative_marking::real`;
    });

    console.log("Quiz schema patch applied successfully.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("Quiz schema patch failed:", e.message);
  process.exit(1);
});
