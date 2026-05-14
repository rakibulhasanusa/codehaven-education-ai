import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function AdminQuestionsPage() {
  const rows = await db()
    .select({
      id: questions.id,
      question: questions.question,
      difficulty: questions.difficulty,
      topic: questions.topic,
      subject: subjects.name,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .orderBy(desc(questions.createdAt))
    .limit(300);

  return (
    <div className="premium-panel rounded-2xl p-6">
      <h1 className="text-2xl font-semibold">Question Bank</h1>
      <p className="text-sm text-muted-foreground mt-1">Use quiz creation page for filtering and multi-select.</p>
      <div className="mt-4 overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Question</th>
              <th className="py-2 pr-3">Subject</th>
              <th className="py-2 pr-3">Topic</th>
              <th className="py-2 pr-3">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className="border-b align-top">
                <td className="py-2 pr-3">{q.question}</td>
                <td className="py-2 pr-3">{q.subject}</td>
                <td className="py-2 pr-3">{q.topic || "-"}</td>
                <td className="py-2 pr-3">{q.difficulty || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
