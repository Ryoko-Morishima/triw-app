export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount, runCandidatesC, runInterpretB, runPersonaA } from "@/lib/openai";
import { initRun, saveRaw } from "@/lib/runlog";

// djs.ts の export 形に柔軟対応
import * as DJs from "@/data/djs";
const DJ_LIST: any[] = Array.isArray((DJs as any).DJ_PRESETS)
  ? (DJs as any).DJ_PRESETS
  : Array.isArray((DJs as any).DJ_PROFILES)
    ? (DJs as any).DJ_PROFILES
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
  let runId = "";
  try {
    const body = await req.json();

    // customDJ を追加で受け取る
    const {
      title,
      description,
      djId,
      mode = "count",
      count,
      duration,
      customDJ, // { name, overview }（Custom選択時のみ）
    } = body || {};

    // 入力チェック
    if (!title || !description || !djId) {
      return NextResponse.json({ error: "title, description, djId は必須" }, { status: 400 });
    }
    if (mode !== "count" && mode !== "duration") {
      return NextResponse.json({ error: "mode は 'count' | 'duration'" }, { status: 400 });
    }
    if (djId === "custom") {
      if (!customDJ?.name || !customDJ?.overview) {
        return NextResponse.json(
          { error: "Custom DJ を選んだ場合は customDJ.name と customDJ.overview が必須です" },
          { status: 400 }
        );
      }
    }

    // runId 発行
    runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // メタ保存（customDJ も残す）
    await initRun({
      runId,
      startedAt: new Date().toISOString(),
      title,
      description,
      djId,
      mode,
      count,
      duration,
      ...(customDJ ? { customDJ } : {}),
    } as any);

    // ========================
    // A: DJペルソナ（Custom も AI 生成）
    // ========================
    let A: any;
    try {
      if (djId === "custom") {
        // ★ 既存の runPersonaA を流用して AI 生成する
        //    djs.tsのプリセットと同じ形に見える“仮のDJ”を作って runPersonaA に渡す
        const pseudoDj = {
          id: "custom",
          name: String(customDJ.name).trim(),
          description: String(customDJ.overview).trim(),
          profile: "", // 任意
        };
        A = await runPersonaA({ dj: pseudoDj, title, description });
        // 由来が分かるようメモを付与（UIには影響なし）
        if (A && typeof A === "object") {
          (A as any).source = "ai-generated(custom)";
        }
      } else {
        const dj = pickDj(djId);
        A = await runPersonaA({ dj, title, description });
      }
      await saveRaw(runId, "A", A);
    } catch (e: any) {
      await saveRaw(runId, "A", { error: String(e?.message || e) });
      // Aが無いと後続も危険なので、最低限の箱を用意
      A = A ?? { id: djId, name: djId, description };
    }

    // ========================
    // B: DJ本人の解釈（既存どおり）
    // ========================
    let B: any;
    try {
      B = await runInterpretB({ persona: A, title, description, mode, count, duration });
      await saveRaw(runId, "B", B);
    } catch (e: any) {
      B = {
        direction_note:
          "（自動フォールバック）番組概要を踏まえ、ペルソナに合わせて静と動を織り交ぜる方針。",
        rationale:
          "フォールバック生成。リスナーの集中を切らさないように、序盤は抑制、中盤以降で厚みを増す想定。",
        flow_style_paragraph:
          "前半は淡々と、サビで密度を上げ、終盤で余韻を残す流れ。",
        hard_constraints_text:
          "放送不可や日本で再生不可は避ける。テーマに明確不一致な曲は除外。",
        soft_preferences_text:
          "ボーカルは過剰に派手でないもの、夜間でも耳疲れしにくい音像を優先。",
        selection_rules:
          "候補出し時点ではふるい落としは行わない。最終採用時にテーマ適合を確認。",
        notes_for_later:
          "分数指定時は±10%に収める。ピンとこなければ類似で補う。",
        _error: String(e?.message || e),
      };
      await saveRaw(runId, "B", B);
    }

    // ========================
    // C: 候補曲（既存どおり）
    // ========================
    let C: any;
    try {
      const target = estimateTargetCount(mode, count, duration);
      C = await runCandidatesC({ persona: A, interpretation: B, targetCount: target });
      await saveRaw(runId, "C", C);
    } catch (e: any) {
      C = { candidates: [], _error: String(e?.message || e) };
      await saveRaw(runId, "C", C);
    }

    // レスポンス（成功扱いで runId を返す）
    return NextResponse.json(
      { runId, djId, candidates: C?.candidates ?? [], fallback: !!C?._error },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("/api/mixtape/plan fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "internal error", ...(runId ? { runId } : {}) },
      { status: 500 }
    );
  }
}
