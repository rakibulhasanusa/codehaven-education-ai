import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExamMeta } from "@/lib/quiz";
import { getExamStatus } from "@/lib/exam-status";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const quizzes = await getExamMeta();
  const now = new Date();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 bg-gradient-to-r from-background via-background to-muted/30">
        <div>
          <CardTitle className="text-2xl">Quizzes</CardTitle>
          <CardDescription>Track quiz timing and open status from one place.</CardDescription>
        </div>
        <Link href="/admin/quizzes/create" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Create Quiz
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="py-3 pl-4 pr-3">Title</th>
                <th className="py-3 pr-3">Subject</th>
                <th className="py-3 pr-3">Topic</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Timing</th>
                <th className="py-3 pr-4">Duration</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No data available.</td>
                </tr>
              ) : quizzes.map((q) => {
                const status = getExamStatus(q, now);
                return (
                  <tr key={q.id} className="border-t border-border/60">
                    <td className="py-3 pl-4 pr-3 font-medium">{q.title}</td>
                    <td className="py-3 pr-3">{q.subjectName}</td>
                    <td className="py-3 pr-3">{q.topic || "-"}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={status === "live" ? "default" : status === "upcoming" ? "outline" : "secondary"}>
                        {status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Closed"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3">{q.timingMode === "fixed_end_time" ? "Fixed End Time" : "Full Duration"}</td>
                    <td className="py-3 pr-4">{q.durationMinutes} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
