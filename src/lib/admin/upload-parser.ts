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

export type UploadRowWithMeta = ParsedUploadRow & { rowNumber: number };

export type ParsedUploadFile = {
  headers: string[];
  rows: UploadRowWithMeta[];
};

const REQUIRED_COLUMNS = ["subject", "question", "optionA", "optionB", "optionC", "optionD", "answer"];

function normalizeRow(row: Record<string, unknown>, rowNumber: number): UploadRowWithMeta {
  return {
    rowNumber,
    subject: String(row.subject ?? "").trim(),
    question: String(row.question ?? "").trim(),
    optionA: String(row.optionA ?? "").trim(),
    optionB: String(row.optionB ?? "").trim(),
    optionC: String(row.optionC ?? "").trim(),
    optionD: String(row.optionD ?? "").trim(),
    answer: String(row.answer ?? "").trim().toUpperCase() as UploadRowWithMeta["answer"],
    explanation: String(row.explanation ?? "").trim() || undefined,
    difficulty: String(row.difficulty ?? "").trim() || undefined,
    topic: String(row.topic ?? "").trim() || undefined,
  };
}

export async function parseUploadFile(file: File): Promise<ParsedUploadFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase();

  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

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
    headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  } else if (ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("XLSX file has no sheet.");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
      raw: false,
      defval: "",
    });
    const headerRows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[sheetName], { header: 1 });
    headers = (headerRows[0] ?? []).map((h) => String(h).trim());
  } else {
    throw new Error("Unsupported file type. Upload .csv or .xlsx");
  }

  const normalizedRows = rows.map((row, index) => normalizeRow(row, index + 2));
  return { headers, rows: normalizedRows };
}

export function validateRows(rows: UploadRowWithMeta[]) {
  const validRows: UploadRowWithMeta[] = [];
  const invalidRows: Array<{ rowNumber: number; reason: string; question: string }> = [];

  for (const row of rows) {
    const isEmpty = !row.subject && !row.question && !row.optionA && !row.optionB && !row.optionC && !row.optionD && !row.answer;
    if (isEmpty) {
      invalidRows.push({ rowNumber: row.rowNumber, reason: "Empty row", question: "" });
      continue;
    }

    const parsed = uploadRowSchema.safeParse(row);
    if (!parsed.success) {
      invalidRows.push({
        rowNumber: row.rowNumber,
        reason: parsed.error.issues[0]?.message || "Invalid row",
        question: row.question,
      });
      continue;
    }

    validRows.push(row);
  }

  return { validRows, invalidRows };
}

export function getMissingRequiredColumns(headers: string[]) {
  const normalizedHeaders = new Set(headers.map((h) => h.trim()));
  return REQUIRED_COLUMNS.filter((col) => !normalizedHeaders.has(col));
}
