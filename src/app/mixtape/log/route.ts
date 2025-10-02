// src/app/mixtape/log/route.ts
import { NextResponse } from "next/server";
import { getLogs } from "@/lib/runlog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  // getLogs は引数なし想定
  const allLogs = getLogs() as any;

  if (runId) {
    const logs = allLogs?.[runId] ?? null;
    if (!logs) {
      return NextResponse.json({ error: "logs not found for runId", runId }, { status: 404 });
    }
    return NextResponse.json({ runId, logs }, { status: 200 });
  }

  // runId 未指定なら全件返す
  return NextResponse.json({ logs: allLogs }, { status: 200 });
}
