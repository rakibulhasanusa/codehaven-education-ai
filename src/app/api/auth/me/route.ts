import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  });
}

