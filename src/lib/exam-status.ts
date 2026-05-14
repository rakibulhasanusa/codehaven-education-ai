export type ExamStatus = "upcoming" | "live" | "closed";

export function getExamStatus(exam: {
  startTime: Date | string | null;
  endTime: Date | string | null;
}, now = new Date()): ExamStatus {
  const startTime = exam.startTime ? new Date(exam.startTime) : null;
  const endTime = exam.endTime ? new Date(exam.endTime) : null;

  if (startTime && now < startTime) return "upcoming";
  if (endTime && now > endTime) return "closed";
  return "live";
}
