export type ExamStatus = "upcoming" | "live" | "closed";

export function getExamStatus(exam: {
  startTime: Date | string | null;
  endTime: Date | string | null;
  timingMode?: string | null;
  durationMinutes?: number | null;
}, now = new Date()): ExamStatus {
  const startTime = exam.startTime ? new Date(exam.startTime) : null;
  const endTime = exam.endTime ? new Date(exam.endTime) : null;

  if (startTime && now < startTime) return "upcoming";
  if (endTime && now > endTime) return "closed";
  if (exam.timingMode === "full_duration" && startTime && typeof exam.durationMinutes === "number") {
    const closeAt = startTime.getTime() + Math.max(1, exam.durationMinutes) * 60_000;
    if (now.getTime() > closeAt) return "closed";
  }
  return "live";
}
