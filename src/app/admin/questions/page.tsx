import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import AdminQuestionsClient from "./AdminQuestionsClient";

export default async function AdminQuestionsPage() {
  const subjectRows = await db()
    .select({ id: subjects.id, name: subjects.name })
    .from(subjects)
    .orderBy(asc(subjects.name));

  return <AdminQuestionsClient subjects={subjectRows} />;
}
