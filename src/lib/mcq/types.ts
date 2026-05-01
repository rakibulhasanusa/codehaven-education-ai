export type Subject =
  | "Bengali Language and Literature"
  | "English Language and Literature"
  | "Bangladesh Studies"
  | "International Studies"
  | "Geography, Environment and Disaster Management"
  | "General Science"
  | "Computer Science"
  | "Mathematical Reasoning"
  | "Mental Ability"
  | "Ethics, Values and Good Governance";

export type BcsSubject = {
  name: string;
  value: Subject;
  username: string;
};

export type QuestionLanguage = "English" | "Bengali";
export type Difficulty = "Basic" | "Medium" | "Hard";

export type MCQQuestion = {
  id: string;
  subject: Subject;
  language: QuestionLanguage;
  difficulty: Difficulty;
  syllabusPart?: number;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type SyllabusPart = {
  partNumber: number;
  title: string;
  focus: string;
};

export type AttemptRecord = {
  id: string;
  learnerName: string;
  createdAt: string;
  language: QuestionLanguage;
  subjects: Subject[];
  questionCount: number;
  score: number;
  accuracyPercent: number;
  avgTimePerQuestion: number;
};

export type SubjectStat = {
  total: number;
  correct: number;
  accuracy: number;
};
