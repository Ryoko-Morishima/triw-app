// src/app/api/mixtape/plan/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  estimateTargetCount,
  runCandidatesC,
  runInterpretB,
  runPersonaA,
  runMemoNoteG, // ← 追加：受け取りメモAI
} from "@/lib/openai";
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

// --- 受け取りメモ生成（AI優先・安全フォールバック付き / ソース可視化） ---
async function buildRecipientMemo({
  persona,
  B,
  title,
  description,
  F,
}: any): Promise<{ text: string; source: "ai" | "fallback"; error?: string }> {
  const djName = (persona?.name || persona?.id || "DJ").trim();

  // B から“方針っぽい一文”を抽出（任意）
  const vibe =
    (B?.flow_style_paragraph && String(B.flow_style_paragraph)) ||
    (B?.direction_note && String(B.direction_note)) ||
    (B?.rationale && String(B.rationale)) ||
    "";

  // 最終セットから title/artist だけを抽出（AIへのヒント用）
  const tracks = (F?.tracks ?? F?.setlist ?? F?.items ?? []) as any[];
  const condensed = tracks.map((t: any) => ({
    title: t?.title ?? t?.name ?? t?.spotify?.name ?? "-",
    artist: t?.artist ?? t?.artists?.[0] ?? t?.spotify?.artists?.[0] ?? "-",
  }));

  try {
    const memo = await runMemoNoteG({
      persona,
      title,
      description,
      vibeText: vibe,
      tracks: condensed,
    });
    const ensured = /\nby\s+/i.test(memo) ? memo : `${memo}\nby ${djName}`;
    return { text: ensured, source: "ai" };
  } catch (e: any) {
  const text = `${title}をテーマに選曲しました。気に入ってくれるかな？ by ${djName}`;
  return { text, source: "fallback", error: String(e?.message || e) };
}
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
      mode = "count", // "count" | "duration"
      count, // 曲数（mode=countのとき）
      duration, // 分数（mode=durationのとき）
      customDJ, // { name, overview }（Custom選択時のみ）
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
    // D〜F: 解決・評価・最終整形
    // ========================
    try {
      // D: Spotify解決（存在確認 & メタ取得）
      const D = resolvedIn ?? (await resolveCandidatesD(C?.candidates ?? []));
      await saveRaw(runId, "D", D);

      // E: 採否（年代ゲート対応）
      const yearGate =
        !!(B?.hard_constraints?.eras) ||
        hasDecadeHint(String(title)) ||
        hasDecadeHint(String(description));

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
        { year_gate: yearGate }
      );
      await saveRaw(runId, "E", E);

// F: 最終整形（★ 統合ポイント）
const isDuration = mode === "duration";
const minutes = Number(isDuration ? duration : 30) || 30;
const maxK = Number(!isDuration ? count : 12) || 12;

const F = await finalizeSetlist(E?.picked ?? [], {
  mode: isDuration ? "duration" : "count",
  ...(isDuration ? { targetDurationMin: minutes, maxTracksHardCap: 30 } : { maxTracks: maxK }),
  artistPolicy: "auto",
  programTitle: title,
  programOverview: description,
  interleaveRoles: true,
  shortReason: true,
});
await saveRaw(runId, "F", F);

// ★★★ ここから追加：カバー画像の埋め戻し ★★★
const byUri = new Map<string, any>();
// D.resolved から uri → 画像URL をマップ化
(D?.resolved ?? []).forEach((r: any) => {
  const uri = r?.uri ?? r?.spotify?.uri ?? r?.track?.uri;
  const img =
    r?.album_image_url ||
    r?.image ||
    r?.cover ||
    r?.album?.images?.[0]?.url ||
    r?.spotify?.album_image_url ||
    null;
  if (uri && img && !byUri.has(uri)) byUri.set(uri, img);
});

// F 内の各曲に cover が無ければ補完
const fItems = (F?.tracks ?? F?.setlist ?? F?.items ?? []) as any[];
fItems.forEach((t: any) => {
  // 既に cover があれば尊重
  if (t?.cover) return;

  // 自身が持っている可能性のあるキーも一応みる
  const selfImg =
    t?.album_image_url ||
    t?.image ||
    t?.cover ||
    t?.album?.images?.[0]?.url ||
    null;

  if (selfImg) {
    t.cover = selfImg;
    return;
  }

  // uri 経由で D.resolved から補完
  const uri = t?.uri ?? t?.spotify?.uri ?? t?.track?.uri;
  const img = uri ? byUri.get(uri) : null;
  if (img) t.cover = img;
});
// ★★★ 追加ここまで ★★★

// --- 追加: UI向けの短いDJコメント（参考メモとして残す）
// ★ ここは “1回だけ” 宣言！ 既に上にあれば再宣言しないこと。
const djNote =
  (B?.flow_style_paragraph && String(B.flow_style_paragraph)) ||
  (B?.direction_note && String(B.direction_note)) ||
  (B?.rationale && String(B.rationale)) ||
  "";

// --- 受け取りメモ（AI or フォールバック判定つき）
const memoRes = await buildRecipientMemo({ persona: A, B, title, description, F });
const memoText = memoRes.text;
const memoFrom = memoRes.source;

// デバッグ保存（runlog で後から確認できる）
await saveRaw(runId, "G", {
  memoFrom,
  memoPreview: memoText.slice(0, 200),
  // error は fallback のときだけ入る
});

// ★ UI互換のために plan オブジェクトを追加（将来はこれに一本化推奨）
const plan = {
  memoText,          // UI: plan?.memoText || plan?.djComment || ""
  djComment: djNote, // 互換: 旧 djComment 表示にも対応
};

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

    // ---- 新推奨
    plan: { memoText, djComment: djNote },
    memoText,             // 旧互換
    djComment: djNote,    // 旧互換
    memoFrom,             // ← 追加： "ai" か "fallback"
    E: { picked: E?.picked ?? [], rejected: E?.rejected ?? [] },
    F,
  },
  { status: 200 }
);

 
    } catch (e: any) {
      await saveRaw(runId, "D", { error: String(e?.message || e) });
      await saveRaw(runId, "E", { error: String(e?.message || e) });
      await saveRaw(runId, "F", { error: String(e?.message || e) });
      return NextResponse.json({ runId, error: String(e?.message || e) }, { status: 500 });
    }
  } catch (err: any) {
    console.error("/api/mixtape/plan fatal error:", err);
    return NextResponse.json(
      { error: err?.message || "internal error", ...(runId ? { runId } : {}) },
      { status: 500 }
    );
  }
}
