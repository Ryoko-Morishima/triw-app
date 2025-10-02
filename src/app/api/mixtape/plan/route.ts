// src/app/api/mixtape/plan/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
  estimateTargetCount,
  runCandidatesC,
  runInterpretB,
  runPersonaA,
  runMemoNoteG,
  runSelfAuditD, // ★ 新：AI自己点検
} from "@/lib/openai";
import { initRun, saveRaw } from "@/lib/runlog";
import { resolveCandidatesD } from "@/lib/resolve";
import { evaluateTracks } from "@/lib/evaluate";
import { finalizeSetlist } from "@/lib/finalize";

// === Resolve helpers (rate-limit aware) ===
function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function parseRetryAfter(err: any): number | null {
  // resolveCandidatesD が {status:429, headers:{'retry-after':seconds}} を投げるケースを想定
  const h = (err?.headers || {}) as Record<string, any>;
  const ra = h["retry-after"] || h["Retry-After"] || err?.retryAfter;
  const n = Number(ra);
  return Number.isFinite(n) && n > 0 ? n * 1000 : null;
}

/**
 * Spotify解決をチャンク分割して順次実行。
 * 429が来たら Retry-After を尊重して同チャンクをリトライ（最大3回）。
 */
async function resolveWithChunks(
  allCandidates: any[],
  {
    chunkSize = 20,
    interChunkDelayMs = 900,
    maxRetriesPerChunk = 3,
  }: { chunkSize?: number; interChunkDelayMs?: number; maxRetriesPerChunk?: number } = {}
) {
  const chunks: any[][] = [];
  for (let i = 0; i < allCandidates.length; i += chunkSize) {
    chunks.push(allCandidates.slice(i, i + chunkSize));
  }
  const resolvedAll: any[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    let attempt = 0;
    // リトライループ
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const r = await resolveCandidatesD(chunk);
        resolvedAll.push(...(r?.resolved ?? r ?? []));
        break; // 成功
      } catch (e: any) {
        attempt++;
        const wait = parseRetryAfter(e);
        if (attempt <= maxRetriesPerChunk) {
          // Retry-After が無ければ指数バックオフ
          const backoff = wait ?? (interChunkDelayMs * Math.pow(2, attempt));
          await sleep(backoff);
          continue;
        }
        // リトライ尽きたら例外
        throw e;
      }
    }
    // 次チャンクまで少し間隔
    if (idx < chunks.length - 1) await sleep(interChunkDelayMs);
  }
  return { resolved: resolvedAll };
}

function keyOf(t: {title?: string; artist?: string}) {
  return `${(t.title||"").toLowerCase().trim()}__${(t.artist||"").toLowerCase().trim()}`;
}


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
    
        // ⬇⬇⬇ ここに dedupeByTrack を定義 ⬇⬇⬇
    function dedupeByTrack(arr: any[]) {
      const seen = new Set<string>();
      const removed: any[] = [];
      const out: any[] = [];
      for (const t of arr ?? []) {
        const uri = t?.uri || t?.spotify?.uri || t?.spotify?.id || null;
        const key = uri
          ? `uri:${uri}`
          : `ta:${(t?.title ?? "").toLowerCase().trim()}::${(t?.artist ?? "")
              .toLowerCase()
              .trim()}`;
        if (seen.has(key)) {
          removed.push({ title: t?.title, artist: t?.artist, uri });
          continue;
        }
        seen.add(key);
        out.push(t);
      }
      try {
        if (removed.length) saveRaw(runId, "E.dedup.removed", removed);
      } catch {}
      return out;
    }
    // ⬆⬆⬆ ここまで ⬆⬆⬆


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
    // A: DJペルソナ（文章で個性を立てる）
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
    // B: DJ本人の解釈（エッセイ）
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
    // C: ペルソナが“直接”選ぶ（候補ではなく指名）
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

    try {

      // ========================
      // D: Spotify解決（存在確認 & メタ取得）— チャンク・429対策
      // ========================
      const baseCandidates: any[] = (C?.candidates ?? []).slice(); // 後で補充するのでコピー
      const D = resolvedIn ?? (await resolveWithChunks(baseCandidates, {
        chunkSize: 20,
        interChunkDelayMs: 900,
        maxRetriesPerChunk: 3,
      }));
      await saveRaw(runId, "D", D);

      // ========================
      // E: 採否（年代ゲート対応・数値はここだけ）
      // ========================
      // ── AI(B)が返した eras だけを信号とする（タイトル/説明のヒントからの推測ではONにしない）
      const erasAny = (B as any)?.hard_constraints?.eras ?? null;

      // 正規化：{start,end} / {min,max} / {decade} / number / 配列先頭 をサポート
      function normalizeEra(v: any): { start: number; end: number } | null {
        if (!v) return null;
        if (typeof v.start === "number" && typeof v.end === "number") return { start: v.start, end: v.end };
        if (typeof v.min === "number" || typeof v.max === "number") {
          const start = typeof v.min === "number" ? v.min : v.max;
          const end = typeof v.max === "number" ? v.max : v.min;
          if (typeof start === "number" && typeof end === "number") return { start, end };
        }
        if (typeof v.decade === "number") return { start: v.decade, end: v.decade + 9 };
        if (typeof v === "number") return { start: v, end: v + 9 };
        if (Array.isArray(v) && v.length) return normalizeEra(v[0]);
        return null;
      }

      const era: { start: number; end: number } | null = normalizeEra(erasAny);
      const yearGate = !!era; // ★ AIが era を出した時だけゲートON

      // 評価（年代ゲート・表記一致・存在確認）
      let E = evaluateTracks(
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
        {
          year_gate: yearGate,
          era, // ← これで evaluate.ts の「範囲外は即 hardReject」が発火
        }
      );
      await saveRaw(runId, "E", E);



    // 観測追加（D2実行“前”に、E.picked から監査入力のスナップだけ取る）
    const auditInput = (E?.picked ?? []).map((x: any) => ({
      title: x?.title ?? "",
      artist: x?.artist ?? "",
      year_guess: x?.debug?.release_year ?? null,
    }));
    await saveRaw(runId, "D2.audit.before", { tracksForAuditCount: auditInput.length, sample: auditInput.slice(0, 5) });

    // ========================
    // D2: AI自己点検（“このDJらしいか？テーマに沿うか？”）
    // ========================
    try {
      const D2 = await runSelfAuditD({ persona: A, interpretation: B, tracks: auditInput });
      await saveRaw(runId, "D2.audit", D2);

      // 表記ゆれ＆index正規化
      type Issue = {
        action?: string;           // "drop" | "replace" | ...
        index?: number | string;   // 想定ズレを吸収
        key?: string | null;       // 曲キー（なければ後段で補う）
        note?: string;
        replacement_hint?: string | null;
      };

      function normalizeD2Issues(raw: Issue[], universeKeys: string[]) {
        const norm = raw.map((it, i) => {
          const action = String(it.action ?? "").trim().toLowerCase();
          // indexは number に落とす（NaNは -1 扱い）
          const idx = typeof it.index === "number"
            ? it.index
            : Number(String(it.index ?? "").replace(/[^\d\-]/g, ""));
          const key = it.key && String(it.key).trim()
            ? String(it.key).trim()
            : (idx >= 0 && idx < universeKeys.length ? universeKeys[idx] : null);
          return { action, index: Number.isFinite(idx) ? idx : -1, key, replacement_hint: it.replacement_hint ?? null, note: it.note ?? null, _row: i };
        });

        const dropIdx = norm.filter(n => n.action === "drop" && n.index >= 0).map(n => n.index);
        const dropKeys = norm.filter(n => n.action === "drop" && n.key).map(n => n.key as string);
        return { normalizedIssues: norm, dropIdx, dropKeys };
      }

      // 正規化＆保存（“監査対象の宇宙”は E.picked の pre-drop セットで作る）
      const universeKeys: string[] = (E?.picked ?? []).map((r: any) =>
        r?._key || r?.spotify?.id || `${r?.title ?? ""}::${r?.artist ?? ""}`
      );
      const norm = normalizeD2Issues((D2?.issues ?? []) as Issue[], universeKeys);
      await saveRaw(runId, "D2.norm", {
        dropIdx: norm.dropIdx,
        dropKeys: norm.dropKeys,
        normalizedIssuesSample: norm.normalizedIssues.slice(0, 10),
      });

        // 1) drop/replace の適用（キー優先、indexは0/1両対応）
      const normIssues = (D2?.issues ?? []).map((i: any) => ({
        action: String(i?.action ?? "").trim().toLowerCase(),
        index: typeof i?.index === "number" ? i.index : Number(String(i?.index ?? "").replace(/[^\d\-]/g, "")),
        key: i?.key ? String(i.key).trim() : null,
        replacement_hint: i?.replacement_hint ?? null,
      }));



      // キー集合（lower/trim）
      const dropKeySet = new Set(
        (norm?.dropKeys ?? normIssues.filter(x => x.action === "drop" || x.action === "replace").map(x => x.key))
          .filter(Boolean)
          .map((s: string) => s.toLowerCase().trim())
      );

      // インデックス集合（0/1両対応で広めにマーク）
      const idxRaw = (norm?.dropIdx ?? normIssues.filter(x => x.action === "drop" || x.action === "replace").map(x => x.index))
        .filter((n: any) => Number.isFinite(n));
      const idxSet = new Set<number>();
      for (const n of idxRaw as number[]) {
        if (n >= 0) idxSet.add(n);        // 0-based の可能性
        if (n - 1 >= 0) idxSet.add(n - 1); // 1-based の可能性（-1して加える）
      }

      // どれが落ちるか先にログ（観測用）
      const willDropSnapshot = (E?.picked ?? []).map((t: any, i: number) => {
        const k = t?._key || t?.spotify?.id || `${(t?.title ?? "").toLowerCase().trim()}::${(t?.artist ?? "").toLowerCase().trim()}`;
        return {
          i,
          key: k,
          title: t?.title,
          artist: t?.artist,
          byKey: dropKeySet.has((k ?? "").toLowerCase()),
          byIdx: idxSet.has(i),
        };
      }).filter(x => x.byKey || x.byIdx);
      await saveRaw(runId, "D2.willDrop.snapshot", willDropSnapshot);

      // 実際の除去（キー優先→インデックス）
      let kept = (E?.picked ?? []).filter((t: any, i: number) => {
        const k = t?._key || t?.spotify?.id || `${(t?.title ?? "").toLowerCase().trim()}::${(t?.artist ?? "").toLowerCase().trim()}`;
        if (k && dropKeySet.has(String(k).toLowerCase())) return false;
        if (idxSet.has(i)) return false;
        return true;
      });

      // 2) 欠落数を最小限補充（候補→解決→評価を“少量だけ”再実行）
      const isDuration = mode === "duration";
      const targetTracks = isDuration
        ? Math.min(30, Math.round((Number(duration || 30) / 4)))  // 目安：4分/曲
        : Number(count || 12);

      const deficit = Math.max(0, targetTracks - kept.length);

      if (deficit > 0) {
        // a) 置換ヒントをログ保存（将来のUI/意味解釈に使う）
        await saveRaw(runId, "D2.replaceHints", (D2?.issues ?? [])
          .filter((i: any) => String(i.action).trim().toLowerCase() === "replace")
          .map((i: any) => ({ index: i.index, hint: i.replacement_hint || "" })));

        // b) ちいさく候補補充（= deficit の 1.5倍まで、上限8）
        const refillTarget = Math.min(8, Math.max(2, Math.ceil(deficit * 1.5)));

        const C_refill = await runCandidatesC({
          persona: A,
          interpretation: B,
          targetCount: refillTarget,
        });
        await saveRaw(runId, "C.refill", C_refill);

        // c) 既出重複を除外
        const existing = new Set(kept.map((t: any) => `${(t?.title ?? "").toLowerCase().trim()}__${(t?.artist ?? "").toLowerCase().trim()}`));
        const refillCandidates = (C_refill?.candidates ?? []).filter((c: any) => `${(c?.title ?? "").toLowerCase().trim()}__${(c?.artist ?? "").toLowerCase().trim()}` && !existing.has(`${(c?.title ?? "").toLowerCase().trim()}__${(c?.artist ?? "").toLowerCase().trim()}`));

        // d) 解決（チャンク＆429対応）
        const D_refill = await resolveWithChunks(refillCandidates, {
          chunkSize: 12,
          interChunkDelayMs: 800,
          maxRetriesPerChunk: 2,
        });
        await saveRaw(runId, "D.refill", D_refill);

        // e) 評価（同じ era スイッチで）
        const E_refill = evaluateTracks(
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
          refillCandidates,
          D_refill.resolved ?? [],
          {
            year_gate: yearGate,
            era,
          }
        );
        await saveRaw(runId, "E.refill", E_refill);

        // ★ 系譜ログ（finalizeに何を渡したかを記録するだけ・挙動は変えない）
        await saveRaw(runId, "E.lineage", {
          usedForFinalize: "picked",
          beforeCount: refillCandidates.length,
          afterCount: Array.isArray(E_refill.picked) ? E_refill.picked.length : null,
        });

        // f) 追加ピック（足りるまで頭から詰める）
        const add = (E_refill?.picked ?? []).slice(0, deficit);
        kept = kept.concat(add);
        kept = dedupeByTrack(kept);
      }

      // g) E を更新
      E = { ...E, picked: kept };
      await saveRaw(runId, "E.afterAudit", E);
    } catch (auditErr: any) {
      await saveRaw(runId, "D2.audit.error", { message: String(auditErr?.message || auditErr) });
    }




        // ========================
      // F: 最終整形（並べ方はBの方針に内包）
      // ========================
      const isDuration = mode === "duration";
      const minutes = Number(isDuration ? duration : 30) || 30;
      const maxK = Number(!isDuration ? count : 12) || 12;

      // ★ 系譜ログを追加（挙動は変えない）
      saveRaw(runId, "E.lineage", {
        usedForFinalize: "picked",
        beforeCount: Array.isArray(E?.picked) ? E.picked.length : null,
        afterCount: Array.isArray(E?.picked) ? E.picked.length : null,
      });

      // ★ finalize前にURI優先で重複除外
      const beforeF = E?.picked ?? [];
      const dedupedForF = dedupeByTrack(beforeF);
      if (dedupedForF.length !== beforeF.length) {
        try {
          await saveRaw(runId, "E.dedup.stats", {
            before: beforeF.length,
            after: dedupedForF.length,
            removed: beforeF.length - dedupedForF.length,
          });
        } catch {}
      }

      // === finalize 直前ガード: 目標との自己整合（不足分だけ小リフィル） ===
      const MS_PER_MIN = 60_000;
      const avgMs = 225_000; // 目安（duration_ms が無いときのフォールバック）
      function sumDurMs(arr: any[]) {
        return (arr ?? []).reduce((acc, t) => {
          const d = t?.duration_ms ?? t?.spotify?.duration_ms ?? avgMs;
          return acc + (Number.isFinite(d) ? d : avgMs);
        }, 0);
      }

      let preF = dedupedForF.slice();

      async function topUpIfNeeded() {
        if (!preF) preF = [];
        if (!Array.isArray(preF)) preF = [];

        if (!isDuration) {
          // count モード: 不足分だけ補充
          const targetCount = Number(count || 12);
          const need = Math.max(0, targetCount - preF.length);
          if (need === 0) {
            // 超過は finalize に任せるが、目標数に丸めておくと安定
            preF = preF.slice(0, targetCount);
            return;
          }
          const refillTarget = Math.min(8, Math.max(2, Math.ceil(need * 1.5)));
          const C_refill2 = await runCandidatesC({ persona: A, interpretation: B, targetCount: refillTarget });
          const existTA = new Set(
            preF.map((t: any) => `${(t?.title ?? "").toLowerCase().trim()}__${(t?.artist ?? "").toLowerCase().trim()}`)
          );
          const cand2 = (C_refill2?.candidates ?? []).filter(
            (c: any) => !existTA.has(`${(c?.title ?? "").toLowerCase().trim()}__${(c?.artist ?? "").toLowerCase().trim()}`)
          );
          const D_refill2 = await resolveWithChunks(cand2, { chunkSize: 12, interChunkDelayMs: 800, maxRetriesPerChunk: 2 });
          const E_refill2 = evaluateTracks(
            { runId, startedAt: new Date().toISOString(), title, description, djId, mode, count, duration } as any,
            cand2,
            D_refill2.resolved ?? [],
            { year_gate: !!era, era }
          );
          preF = dedupeByTrack(preF.concat((E_refill2?.picked ?? []).slice(0, need)));
          return;
        }

        // duration モード: 目標±10%に収束するまで少しだけ補充（最大2回）
        const targetMs = (Number(duration || 30) || 30) * MS_PER_MIN;
        const lower = Math.floor(targetMs * 0.90);
        const upper = Math.ceil(targetMs * 1.10);
        let total = sumDurMs(preF);

        for (let round = 0; round < 2 && total < lower; round++) {
          const remainMs = Math.max(0, targetMs - total);
          const need = Math.min(8, Math.max(2, Math.ceil(remainMs / avgMs))); // 目安で見積
          const C_refill2 = await runCandidatesC({ persona: A, interpretation: B, targetCount: need });
          const existTA = new Set(
            preF.map((t: any) => `${(t?.title ?? "").toLowerCase().trim()}__${(t?.artist ?? "").toLowerCase().trim()}`)
          );
          const cand2 = (C_refill2?.candidates ?? []).filter(
            (c: any) => !existTA.has(`${(c?.title ?? "").toLowerCase().trim()}__${(c?.artist ?? "").toLowerCase().trim()}`)
          );
          const D_refill2 = await resolveWithChunks(cand2, { chunkSize: 12, interChunkDelayMs: 800, maxRetriesPerChunk: 2 });
          const E_refill2 = evaluateTracks(
            { runId, startedAt: new Date().toISOString(), title, description, djId, mode, count, duration } as any,
            cand2,
            D_refill2.resolved ?? [],
            { year_gate: !!era, era }
          );
          preF = dedupeByTrack(preF.concat(E_refill2?.picked ?? []));
          total = sumDurMs(preF);
        }
        // 超過は finalize に任せる
      }

      await topUpIfNeeded();

      const F = await finalizeSetlist(preF, {
        mode: isDuration ? "duration" : "count",
        ...(isDuration
          ? { targetDurationMin: minutes, maxTracksHardCap: 30 }
          : { maxTracks: maxK }),
        artistPolicy: "auto",
        programTitle: title,
        programOverview: description,
        interleaveRoles: true,
        shortReason: true,
      });
      await saveRaw(runId, "F", F);


      

// ★★★ カバー画像の埋め戻し（D.resolved→F） ★★★
const byUri = new Map<string, any>();
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

const fItems = (F?.tracks ?? F?.setlist ?? F?.items ?? []) as any[];

fItems.forEach((t: any) => {
  if (t?.cover) return;

  const selfImg =
    t?.album_image_url || t?.image || t?.cover || t?.album?.images?.[0]?.url || null;
  if (selfImg) {
    t.cover = selfImg;
    return;
  }

  const uri = t?.uri ?? t?.spotify?.uri ?? t?.track?.uri;
  const img = uri ? byUri.get(uri) : null;
  if (img) t.cover = img;
});
// ★★★ ここまで ★★★


      // UI向けの短いDJコメント（参考メモとして残す）
      const djNote =
        (B?.flow_style_paragraph && String(B.flow_style_paragraph)) ||
        (B?.direction_note && String(B.direction_note)) ||
        (B?.rationale && String(B.rationale)) ||
        "";

      // 受け取りメモ（AI or フォールバック判定つき）
      const memoRes = await buildRecipientMemo({ persona: A, B, title, description, F });
      const memoText = memoRes.text;
      const memoFrom = memoRes.source;

      await saveRaw(runId, "G", {
        memoFrom,
        memoPreview: memoText.slice(0, 200),
      });

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
          plan: { memoText, :djComment djNote },
          memoText, // 旧互換
          djComment: djNote, // 旧互換
          memoFrom, // "ai" | "fallback"

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
