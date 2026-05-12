"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

type Subject = { id: number; name: string; slug: string; questionCount: number };
type Generated = {
  mcq: {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: "A" | "B" | "C" | "D";
    explanation: string;
    difficulty?: string;
    topic?: string;
  };
  similarityScore: number;
};

export default function BcsPage() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bcs/subjects", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setSubjects(json.subjects || []));
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <section className="mb-5 rounded-2xl border bg-white/85 p-6">
        <h1 className="text-2xl font-semibold">BCS MCQ Generator</h1>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <button key={subject.id} onClick={() => setSelected(subject.id)} className={`rounded-xl border p-4 text-left ${selected === subject.id ? "border-primary bg-primary/5" : "bg-white"}`}>
            <p className="font-semibold">{subject.name}</p>
            <p className="text-sm text-muted-foreground">{subject.questionCount} available</p>
          </button>
        ))}
      </section>

      <div className="mt-5 flex gap-2">
        <Button disabled={!selected || loading} onClick={async () => {
          setLoading(true); setError(""); setResult(null);
          const res = await fetch("/api/bcs/generate-mcq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId: selected, maxRetries: 4 }) });
          const json = await res.json();
          if (!res.ok) setError(json.error || "Failed to generate MCQ"); else setResult(json);
          setLoading(false);
        }}>{loading ? "Generating..." : "Generate MCQ"}</Button>

        <Button variant="outline" disabled={!selected || !result || saving} onClick={async () => {
          if (!selected || !result) return;
          setSaving(true);
          const res = await fetch("/api/bcs/save-generated", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subjectId: selected, mcq: result.mcq }),
          });
          const json = await res.json();
          setSaving(false);
          if (!res.ok) return push("Save failed", json.error || "Could not save question.");
          push("Saved to question bank", `Question ID: ${json.questionId}`);
        }}>{saving ? "Saving..." : "Save to Bank"}</Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {result ? (
        <section className="mt-5 rounded-2xl border bg-white p-6">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Similarity score: {result.similarityScore.toFixed(3)}</p>
          <h2 className="text-lg font-semibold">{result.mcq.question}</h2>
          <ul className="mt-3 space-y-2 text-sm"><li>A. {result.mcq.optionA}</li><li>B. {result.mcq.optionB}</li><li>C. {result.mcq.optionC}</li><li>D. {result.mcq.optionD}</li></ul>
          <p className="mt-4 text-sm"><span className="font-semibold">Correct:</span> {result.mcq.correctAnswer}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Explanation:</span> {result.mcq.explanation}</p>
        </section>
      ) : null}
    </main>
  );
}
