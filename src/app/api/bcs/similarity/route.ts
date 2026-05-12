import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Similarity embedding endpoint is disabled. Embeddings are reserved for admin-uploaded questions only." },
    { status: 410 }
  );
}
