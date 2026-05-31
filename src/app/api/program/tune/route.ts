// src/app/api/program/tune/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount } from "@/lib/openai";
import { runTuneCandidatesC } from "@/lib/triw/selection/generateTuneCandidates";
import { resolveCandidatesD } from "@/lib/triw/spotify/resolveCandidates";
import { buildVisibleQueue } from "@/lib/triw/program/buildVisibleQueue";
import { buildEvents } from "@/lib/triw/program/buildEvents";
import { evaluateTuneTracks } from "@/lib/triw/program/evaluateTuneTracks";
import type { ProgramInput, ProgramState } from "@/lib/triw/program/types";

import { buildDescription } from "@/lib/triw/program/buildTuneDescription";
import { buildTuneInterpretation } from "@/lib/triw/selection/buildTuneInterpretation";
import { buildPromptPlan } from "@/lib/triw/prompt/buildPromptPlan";

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

    const programInput: ProgramInput = {
      title: input?.title ?? "TRIW チューニング番組",
      description: input?.description,
      keywords,
      era: Number(era),
      temperature: Number(temperature),
      popularity: Number(popularity),
      talkEnabled: Boolean(talkEnabled),
      mode: mode === "duration" ? "duration" : "count",
      count: count === undefined ? undefined : Number(count),
      duration: duration === undefined ? undefined : Number(duration),
    };

    const runId = `tune_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const description = buildDescription(programInput);

    const targetCount = estimateTargetCount(
      programInput.mode,
      programInput.count ?? 5,
      programInput.duration,
    );

    const persona = {
      id: "tune",
      name: "TRIW Tune",
      description: "カードとスライダー入力に基づいて選曲する軽量モード。",
      profile: "",
    };

    const interpretation = buildTuneInterpretation({
      keywords: programInput.keywords,
      era: programInput.era,
      temperature: programInput.temperature,
      popularity: programInput.popularity,
      description,
    });

    const promptPlan = buildPromptPlan({
      programInput,
      interpretation,
    });
    console.log("[interpretation]", interpretation);
    console.log("[promptPlan]", promptPlan);

    const t0 = Date.now();

    // C: 候補生成
    const C = await runTuneCandidatesC({
      persona,
      interpretation,
      promptPlan,
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
      popularity: programInput.popularity,
      era: programInput.era,
    });

    const t3 = Date.now();
    console.log("[tune] E evaluate", t3 - t2, "ms");

    // F: 表に出す visibleQueue を作る
    const visibleQueue = buildVisibleQueue(E.reservePool, {
      maxTracks: Number(programInput.count || 5),
    });

    const t4 = Date.now();
    console.log("[tune] F visibleQueue", t4 - t3, "ms");
    console.log("[tune] total", t4 - t0, "ms");

    const events = buildEvents(visibleQueue);

    const visibleUris = new Set(
      visibleQueue.map((track) => track.uri).filter(Boolean),
    );

    const reservePool = E.reservePool.filter((track) => {
      if (!track.uri) return true;
      return !visibleUris.has(track.uri);
    });

    const state: ProgramState = {
      runId,
      input: programInput,
      description,
      visibleQueue,
      reservePool,
      rejected: E.rejected,
      events,
    };

    const runLogPayload = {
      runId,
      input: programInput,
      description,
      promptPlan,

      prompt: C.prompt,

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
      { status: 500 },
    );
  }
}
