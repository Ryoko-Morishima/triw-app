// src/app/api/program/tune/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount } from "@/lib/openai";
import { runTuneCandidatesC } from "@/lib/triw/selection/generateTuneCandidates";
import { resolveCandidatesD } from "@/lib/resolve";
import { buildVisibleQueue } from "@/lib/triw/program/buildVisibleQueue";
import { buildEvents } from "@/lib/triw/program/buildEvents";
import { evaluateTuneTracks } from "@/lib/triw/program/evaluateTuneTracks";
import type { ProgramState } from "@/lib/triw/program/types";

import { buildDescription } from "@/lib/triw/program/buildTuneDescription";
import { buildTuneInterpretation } from "@/lib/triw/selection/buildTuneInterpretation";

import { saveRunLog } from "@/lib/triw/logs/saveRunLog";

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();

    const {
      keywords = [],
      era = 50,
      temperature = 50,
      popularity = 50,
      talkEnabled = true,
      mode = "count",
      count = 5,
      duration,
    } = input ?? {};

    const runId = `tune_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const description = buildDescription({
      keywords,
      era,
      temperature,
      popularity,
      talkEnabled,
    });

    const targetCount = estimateTargetCount(mode, count, duration);

    const persona = {
      id: "tune",
      name: "TRIW Tune",
      description: "カードとスライダー入力に基づいて選曲する軽量モード。",
      profile: "",
    };

    const interpretation = buildTuneInterpretation({
      keywords,
      era: Number(era),
      temperature: Number(temperature),
      popularity: Number(popularity),
      description,
    });

    console.log("[interpretation]", interpretation);

    const t0 = Date.now();

    // C: 候補生成
    const C = await runTuneCandidatesC({
      persona,
      interpretation,
      targetCount,
    });

    const t1 = Date.now();
    console.log("[tune] C candidates", t1 - t0, "ms");

    // D: Spotify解決
    const D = await resolveCandidatesD(C?.candidates ?? []);

    const t2 = Date.now();
    console.log("[tune] D spotify resolve", t2 - t1, "ms");

    // E: score / state 評価
    const E = evaluateTuneTracks(D?.resolved ?? [], {
      popularity: Number(popularity),
      era: Number(era),
    });

    const t3 = Date.now();
    console.log("[tune] E evaluate", t3 - t2, "ms");

    // F: 表に出す visibleQueue を作る
    const visibleQueue = buildVisibleQueue(E.reservePool, {
      maxTracks: Number(count || 5),
    });

    const t4 = Date.now();
    console.log("[tune] F visibleQueue", t4 - t3, "ms");
    console.log("[tune] total", t4 - t0, "ms");

    const events = buildEvents(visibleQueue);

    const visibleUris = new Set(
      visibleQueue.map((track) => track.uri).filter(Boolean)
    );

    const reservePool = E.reservePool.filter((track) => {
      if (!track.uri) return true;
      return !visibleUris.has(track.uri);
    });

    const state: ProgramState = {
      runId,
      input,
      description,
      visibleQueue,
      reservePool,
      rejected: E.rejected,
      events,
    };

    const runLogPayload = {
      runId,
      input,
      description,

      timings: {
        C: t1 - t0,
        D: t2 - t1,
        E: t3 - t2,
        F: t4 - t3,
        total: t4 - t0,
      },

      C,
      D,
      E,

      F: {
        visibleQueue,
      },

      events,
      state,
    };

    const runlog = await saveRunLog({
      runId,
      payload: runLogPayload,
    });

    return NextResponse.json({
      ...runLogPayload,
      runlog,
    });
  } catch (e: any) {
    console.error("/api/program/tune error:", e);

    return NextResponse.json(
      {
        error: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}