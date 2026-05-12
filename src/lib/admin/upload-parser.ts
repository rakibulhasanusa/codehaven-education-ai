import Papa from "papaparse";
import * as XLSX from "xlsx";
import { uploadRowSchema } from "@/lib/validation/mcq";

export type ParsedUploadRow = {
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: "A" | "B" | "C" | "D";
  explanation?: string;
  difficulty?: string;
  topic?: string;
};

function normalizeRow(row: Record<string, unknown>): ParsedUploadRow {
  return {
    subject: String(row.subject ?? "").trim(),
    question: String(row.question ?? "").trim(),
    optionA: String(row.optionA ?? "").trim(),
    optionB: String(row.optionB ?? "").trim(),
    optionC: String(row.optionC ?? "").trim(),
    optionD: String(row.optionD ?? "").trim(),
    answer: String(row.answer ?? "").trim().toUpperCase() as ParsedUploadRow["answer"],
    explanation: String(row.explanation ?? "").trim() || undefined,
    difficulty: String(row.difficulty ?? "").trim() || undefined,
    topic: String(row.topic ?? "").trim() || undefined,
  };
}

export async function parseUploadFile(file: File): Promise<ParsedUploadRow[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase();

  let rows: Record<string, unknown>[] = [];

  if (ext.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf-8"), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors[0]?.message || "Invalid CSV format.");
    }
    rows = parsed.data;
  } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("XLSX file has no sheet.");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
      raw: false,
      defval: "",
    });
  } else {
    throw new Error("Unsupported file type. Upload .csv or .xlsx");
  }

  const normalized = rows.map(normalizeRow);
  const validated = normalized.map((row, index) => {
    const parsed = uploadRowSchema.safeParse(row);
    if (!parsed.success) {
      throw new Error(`Row ${index + 2}: ${parsed.error.issues[0]?.message || "Invalid row."}`);
    }
    return parsed.data;
  });

  return validated;
}
