import { NextRequest, NextResponse } from "next/server";
import { buildEvents } from "@/lib/triw/program/buildEvents";

export async function GET() {
  return NextResponse.json({
    message: "program/create alive",
  });
}

export async function POST(req: NextRequest) {
  console.log("program/create cookie:", req.headers.get("cookie"));
  const body = await req.json();

  const baseUrl = req.nextUrl.origin;

  const res = await fetch(`${baseUrl}/api/mixtape/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

if (!res.ok) {
  return NextResponse.json(
    {
      error: "mixtape plan failed",
      status: res.status,
      detail: data,
    },
    { status: res.status }
  );
}
  const events = buildEvents(data.F);

  return NextResponse.json({
    ...data,
    runId: data.runId ?? data.id ?? `program-${Date.now()}`,
    input: body,
    events,
  });
}