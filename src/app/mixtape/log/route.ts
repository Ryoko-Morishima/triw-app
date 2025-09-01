// src/app/api/mixtape/log/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getLogs } from "@/lib/runlog";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId is required" }, { status: 400 });
  const logs = getLogs(runId);
  return NextResponse.json({ runId, logs }, { status: 200 });
}
