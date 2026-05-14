"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = { rank: number; name: string; score: number; accuracy: number; speed: number; timeTakenSeconds: number };

export default function ExamLeaderboardPage() {
  const params = useParams<{ id: string }>();
  const examId = Number(params.id);
  const [range, setRange] = useState<"daily" | "weekly" | "overall">("overall");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/exam/${examId}/leaderboard?range=${range}`, { cache: "no-store" });
      const json = await res.json();
      setRows(json.leaderboard || []);
    };
    void load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [examId, range]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="premium-panel rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Leaderboard</h1>
          <select className="border rounded-lg px-3 py-2" value={range} onChange={(e) => setRange(e.target.value as "daily" | "weekly" | "overall")}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="overall">Overall</option>
          </select>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Rank</th><th className="py-2">User</th><th className="py-2">Score</th><th className="py-2">Accuracy</th><th className="py-2">Speed</th><th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.rank}-${r.name}`} className="border-b">
                  <td className="py-2">{r.rank}</td><td className="py-2">{r.name}</td><td className="py-2">{r.score}</td><td className="py-2">{r.accuracy}%</td><td className="py-2">{r.speed}</td><td className="py-2">{Math.round(r.timeTakenSeconds / 60)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
