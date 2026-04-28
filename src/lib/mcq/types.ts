export type Subject =
  | "বাংলা ভাষা ও সাহিত্য"
  | "English Language and Literature"
  | "বাংলাদেশ বিষয়াবলি"
  | "আন্তর্জাতিক বিষয়াবলি"
  | "ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা"
  | "সাধারণ বিজ্ঞান"
  | "কম্পিউটার ও তথ্য প্রযুক্তি"
  | "গাণিতিক যুক্তি"
  | "মানসিক দক্ষতা"
  | "নৈতিকতা, মূল্যবোধ ও সুশাসন";
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
