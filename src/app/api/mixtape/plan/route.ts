// src/app/api/mixtape/plan/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { estimateTargetCount, runCandidatesC, runInterpretB, runPersonaA } from "@/lib/openai";
import { initRun, saveRaw } from "@/lib/runlog";
import { resolveCandidatesD } from "@/lib/resolve";
import { evaluateTracks } from "@/lib/evaluate";
import { finalizeSetlist } from "@/lib/finalize";

// ====== djs.ts を“実行時に安全に読む”ための動的インポート・ヘルパ ======
async function loadDJList(): Promise<any[]> {
  try {
    const mod: any = await import("@/data/djs"); // 静的解析を避ける
    const candidates = [mod.DJ_PRESETS, mod.DJ_PROFILES, mod.default, mod.list, mod.djs];
    for (const arr of candidates) if (Array.isArray(arr)) return arr;
  } catch {
    // 何も export されていない、またはモジュールが無い場合は空配列
  }
  return [];
}

function pickDjFrom(
  list: any[],
  djId: string
): { id: string; name?: string; description?: string; profile?: string } {
  const dj: any = Array.isArray(list) ? list.find((d: any) => d.id === djId) : null;
  if (dj) {
    const name = dj.name || dj.displayName || dj.title || dj.shortName || dj.id;
    const desc = dj.description || dj.desc || dj.summary || "";
    const profile = dj.profile || dj.prompt || dj.notes || "";
    return { id: dj.id, name, description: desc, profile };
  }
  return { id: djId };
}

// ====== 年代ワード検出（年ゲート用） ======
function hasDecadeHint(s: string): boolean {
  const text = (s || "").toLowerCase();
  // 英語表現 & 西暦
  const en = /(?:19[5-9]0s|20[0-2]0s|195\d|196\d|197\d|198\d|199\d|200\d|201\d|202\d|80s|90s|70s|60s)/;
  // 日本語表現
  const ja = /(?:昭和|平成|令和|[5-9]0年代|[1-2]0年代)/;
  return en.test(text) || ja.test(text);
}

// ====== 年代パース（十年単位 Era を取り出す：1990s/90年代 等） ======
function parseEra(text: string): { start: number; end: number } | null {
  const s = (text || "").toLowerCase();

  // 英語: 1990s / 2000s / 70s / 80s
  const m1 = s.match(/\b(19[5-9]0|20[0-2]0)s\b/); // 1950s〜2020s
  if (m1) {
    const start = Number(m1[1]);
    return { start, end: start + 9 };
  }
  const m2 = s.match(/\b([6-9]0)s\b/); // 60s〜90s → 1900年代に寄せる
  if (m2) {
    const d = Number(m2[1]); // 60,70,80,90
    const start = 1900 + d;
    return { start, end: start + 9 };
  }

  // 日本語: 90年代 / 70年代 / 10年代 / 20年代
  const m3 = s.match(/([5-9]0)年代/); // 50年代〜90年代 → 1900年代扱い
  if (m3) {
    const d = Number(m3[1]); // 50,60,70,80,90
    const start = 1900 + d;
    return { start, end: start + 9 };
  }
  const m4 = s.match(/([12]0)年代/); // 10年代 / 20年代 → 2000年代扱い
  if (m4) {
    const d = Number(m4[1]); // 10 or 20
    const start = 2000 + d;
    return { start, end: start + 9 };
  }

  // 元号はざっくり（必要になったら精密化）
  if (/平成/.test(s)) return { start: 1989, end: 2019 };
  if (/昭和/.test(s)) return { start: 1926, end: 1989 };
  if (/令和/.test(s)) return { start: 2019, end: 2099 };

  return null;
}




// ====== ハンドラ ======
export async function POST(req: NextRequest) {
  let runId = "";
  try {
    const body = await req.json();

    // UIから来る値を受け取り（フロントは曲数/分数のどちらかを選択）
    const {
      title,
      description,
      djId,
      mode = "count",         // "count" | "duration"
      count,                  // 曲数（mode=countのとき）
      duration,               // 分数（mode=durationのとき）
      customDJ,               // { name, overview }（Custom選択時のみ）
      // 既に候補/解決がある場合の直渡しにも対応（任意）
      candidates: candidatesIn,
      resolved: resolvedIn,
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

    // djs.ts を実行時に読み込む
    const DJ_LIST = await loadDJList();

    // runId 発行
    runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // メタ保存
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
    // A: DJペルソナ
    // ========================
    let A: any;
    try {
      if (djId === "custom") {
        const pseudoDj = {
          id: "custom",
          name: String(customDJ.name).trim(),
          description: String(customDJ.overview).trim(),
          profile: "",
        };
        A = await runPersonaA({ dj: pseudoDj, title, description });
        if (A && typeof A === "object") (A as any).source = "ai-generated(custom)";
      } else {
        const dj = pickDjFrom(DJ_LIST, djId);
        A = await runPersonaA({ dj, title, description });
      }
      await saveRaw(runId, "A", A);
    } catch (e: any) {
      await saveRaw(runId, "A", { error: String(e?.message || e) });
      A = A ?? { id: djId, name: djId, description };
    }

    // ========================
    // B: DJ本人の解釈
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
        flow_style_paragraph: "前半は淡々と、サビで密度を上げ、終盤で余韻を残す流れ。",
        hard_constraints_text: "放送不可や日本で再生不可は避ける。テーマに明確不一致な曲は除外。",
        soft_preferences_text:
          "ボーカルは過剰に派手でないもの、夜間でも耳疲れしにくい音像を優先。",
        selection_rules: "候補出し時点ではふるい落としは行わない。最終採用時にテーマ適合を確認。",
        notes_for_later: "分数指定時は±10%に収める。ピンとこなければ類似で補う。",
        _error: String(e?.message || e),
      };
      await saveRaw(runId, "B", B);
    }

    // ========================
    // C: 候補曲（popularityヒントなど付与）
    // ========================
    let C: any;
    try {
      const target = estimateTargetCount(mode, count, duration);
      C = candidatesIn
        ? { candidates: candidatesIn }
        : await runCandidatesC({ persona: A, interpretation: B, targetCount: target });
      await saveRaw(runId, "C", C);
    } catch (e: any) {
      C = { candidates: [], _error: String(e?.message || e) };
      await saveRaw(runId, "C", C);
    }

    // ========================
    // D: Spotify解決（存在確認 & メタ取得）
    // ========================
    let D: any;
    try {
      D = resolvedIn ?? (await resolveCandidatesD(C?.candidates ?? []));
      await saveRaw(runId, "D", D);
// ========================
// E: 採否（年代ゲート対応）
// ========================
const yearGate =
  !!(B?.hard_constraints?.eras) ||
  hasDecadeHint(String(title)) ||
  hasDecadeHint(String(description));

// Era を抽出（年代範囲を返す）
const eraFromText =
  parseEra(String(title)) ||
  parseEra(String(description)) ||
  null;

const E = evaluateTracks(
  {
    runId,
    startedAt: new Date().toISOString(),
    title,
    description,
    djId,
    mode,
    count,
    duration,
  } as any,
  C?.candidates ?? [],
  D.resolved ?? [],
  { year_gate: yearGate, era: eraFromText }
); // ← ここで呼び出しを閉じる！

await saveRaw(runId, "E", E);

      // ========================
      // F: 最終整形（★ 統合ポイント）
      // ========================
      const isDuration = mode === "duration";
      const minutes = Number(isDuration ? duration : 30) || 30;
      const maxK = Number(!isDuration ? count : 12) || 12;

      const F = await finalizeSetlist(E?.picked ?? [], {
        mode: isDuration ? "duration" : "count",
        ...(isDuration ? { targetDurationMin: minutes, maxTracksHardCap: 30 } : { maxTracks: maxK }),
        artistPolicy: "auto",            // タイトル/概要から“特集”を自動判定
        programTitle: title,
        programOverview: description,
        interleaveRoles: true,
        shortReason: true,
        // 必要に応じて: maxPerArtist: 2,
      });

      await saveRaw(runId, "F", F);

      // レスポンス（A〜Fの要点を返す）
      return NextResponse.json(
        {
          runId,
          djId,
          title,
          description,
          mode,
          count,
          duration,
          fallback: !!C?._error,
          E: { picked: E?.picked ?? [], rejected: E?.rejected ?? [] },
          F, // 最終プレイリスト
        },
        { status: 200 }
      );
    } catch (e: any) {
      await saveRaw(runId, "D", { error: String(e?.message || e) });
      await saveRaw(runId, "E", { error: String(e?.message || e) });
      await saveRaw(runId, "F", { error: String(e?.message || e) });
      return NextResponse.json(
        { runId, error: String(e?.message || e) },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("/api/mixtape/plan fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "internal error", ...(runId ? { runId } : {}) },
      { status: 500 }
    );
  }
}
