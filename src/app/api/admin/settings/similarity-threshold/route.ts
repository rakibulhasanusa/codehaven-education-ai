import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSimilarityThreshold, setSimilarityThreshold } from "@/lib/db/settings";

const schema = z.object({ threshold: z.number().min(0).max(1) });

export async function GET() {
  const threshold = await getSimilarityThreshold();
  return NextResponse.json({ threshold });
}

export async function PUT(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const threshold = await setSimilarityThreshold(parsed.data.threshold);
  return NextResponse.json({ threshold });
}
