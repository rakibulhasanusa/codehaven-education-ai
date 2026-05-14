import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExamMeta } from "@/lib/quiz";
import ExamListClient from "./ExamListClient";

export const dynamic = "force-dynamic";

export default async function ExamListPage() {
  const exams = await getExamMeta();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-background via-background to-muted/30">
          <CardTitle className="text-3xl">Available Exams</CardTitle>
          <CardDescription>Enter your name before starting. Exams with a start time will show a live countdown on the exam page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExamListClient initialExams={exams} />
        </CardContent>
      </Card>
    </main>
  );
}
