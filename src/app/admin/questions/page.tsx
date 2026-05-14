import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const difficultyStyle: Record<string, string> = {
  easy:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50  text-amber-700  border-amber-200",
  hard:   "bg-rose-50   text-rose-700   border-rose-200",
};

export default async function AdminQuestionsPage() {
  const rows = await db()
    .select({
      id:         questions.id,
      question:   questions.question,
      difficulty: questions.difficulty,
      topic:      questions.topic,
      subject:    subjects.name,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .orderBy(desc(questions.createdAt))
    .limit(300);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Question Bank</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Showing latest {rows.length} questions. Use the quiz creation page for filtering.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {rows.length} rows
        </Badge>
      </div>

      {/* ── Table card ──────────────────────────────────────────── */}
      <div className="premium-panel overflow-hidden rounded-xl">
        <div className="overflow-auto max-h-[72vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">
                  Topic
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">
                  Difficulty
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    No questions found.
                  </td>
                </tr>
              ) : (
                rows.map((q, idx) => {
                  const diffKey = q.difficulty?.toLowerCase() ?? "";
                  return (
                    <tr
                      key={q.id}
                      className="group align-top transition-colors hover:bg-muted/30"
                    >
                      {/* Row number + question */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 shrink-0 tabular-nums text-[11px] text-muted-foreground/50 select-none">
                            {idx + 1}
                          </span>
                          <span className="leading-snug text-foreground">
                            {q.question}
                          </span>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {q.subject}
                        </Badge>
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {q.topic ?? (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Difficulty */}
                      <td className="px-4 py-3">
                        {q.difficulty ? (
                          <span
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${
                              difficultyStyle[diffKey] ??
                              "bg-muted/60 text-muted-foreground border-border"
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}