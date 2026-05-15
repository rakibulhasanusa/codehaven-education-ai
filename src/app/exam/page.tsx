import { getExamMeta } from "@/lib/quiz";
import ExamListClient from "./ExamListClient";

export const dynamic = "force-dynamic";

export default async function ExamListPage() {
  const exams = (await getExamMeta()).filter((exam) => exam.isPublished !== 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="premium-panel mb-6 overflow-hidden">
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.49 0.17 250), oklch(0.67 0.13 165), oklch(0.72 0.15 78))",
          }}
        />
        <div className="p-6 pb-5">
          <span className="premium-kicker">Quiz Portal</span>
          <h1 className="premium-title mt-1 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Available Exams
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Enter your name before starting. Exams with a scheduled start time show a live
            countdown. Live exams are open now.
          </p>
        </div>
      </div>

      {/* ── Exam grid ────────────────────────────────────────────────── */}
      <ExamListClient initialExams={exams} />
    </main>
  );
}
