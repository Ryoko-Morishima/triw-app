export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount, runCandidatesC, runInterpretB, runPersonaA } from "@/lib/openai";
import { initRun, saveRaw } from "@/lib/runlog";

// djs.ts の export 形に柔軟対応
import * as DJs from "@/data/djs";
const DJ_LIST: any[] = Array.isArray((DJs as any).DJ_PROFILES)
  ? (DJs as any).DJ_PROFILES
  : Array.isArray((DJs as any).DJ_PRESETS)
    ? (DJs as any).DJ_PRESETS
    : Array.isArray((DJs as any).default)
      ? (DJs as any).default
      : [];

function pickDj(djId: string): { id: string; name?: string; description?: string; profile?: string } {
  const dj: any = Array.isArray(DJ_LIST) ? DJ_LIST.find((d: any) => d.id === djId) : null;
  if (dj) {
    const name = dj.name || dj.displayName || dj.title || dj.shortName || dj.id;
    const desc = dj.description || dj.desc || dj.summary || "";
    const profile = dj.profile || dj.prompt || dj.notes || "";
    return { id: dj.id, name, description: desc, profile };
  }
  return { id: djId };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, djId, mode = "count", count, duration } = body || {};

    if (!title || !description || !djId) {
      return NextResponse.json({ error: "title, description, djId は必須" }, { status: 400 });
    }
    if (mode !== "count" && mode !== "duration") {
      return NextResponse.json({ error: "mode は 'count' | 'duration'" }, { status: 400 });
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await initRun({
      runId,
      startedAt: new Date().toISOString(),
      title,
      description,
      djId,
      mode,
      count,
      duration,
    });

    const dj = pickDj(djId);

    // A
    const A = await runPersonaA({ dj, title, description });
    await saveRaw(runId, "A", A);
    // B（DJ本人）
    const B = await runInterpretB({ persona: A, title, description, mode, count, duration });
    await saveRaw(runId, "B", B);
    // C（DJ本人）
    const target = estimateTargetCount(mode, count, duration);
    const C = await runCandidatesC({ persona: A, interpretation: B, targetCount: target });
    await saveRaw(runId, "C", C);

    return NextResponse.json({ runId, djId, candidates: C.candidates }, { status: 200 });
  } catch (err: any) {
    console.error("/api/mixtape/plan error:", err);
    return NextResponse.json({ error: err?.message || "internal error" }, { status: 500 });
  }
}
