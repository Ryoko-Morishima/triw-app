// src/lib/evaluate.ts
import type { CandidateC } from "@/lib/openai";
import type { RunMeta } from "@/lib/runlog";
import { saveRaw as saveRunlog } from "@/lib/runlog";

// D.json の resolved の想定型
type DResolved = {
  title: string;
  artist: string;
  year_guess?: number | null;
  intended_role?: "anchor" | "deep" | "wildcard";
  popularity_hint?: "high" | "mid" | "low";
  spotify?: {
    id: string;
    uri: string;
    name: string;
    artists: string[];
    release_year?: number | null;
    popularity?: number | null;
    preview_url?: string | null;
    album_image_url?: string | null;
    tempo?: number | null;
    energy?: number | null;
    // @ts-ignore
    original_release_year?: number | null;
  };
};

export type Evaluated = {
  title: string;
  artist: string;
  uri?: string | null;
  confidence: number;
  reason: string;
  accepted: boolean;
  debug?: {
    match_kind: "exact" | "fuzzy" | "none";
    resolved_title?: string;
    resolved_artist0?: string;

    popularity?: number | null;
    popularity_hint?: "high" | "mid" | "low";
    popularity_score: number;

    role?: "anchor" | "deep" | "wildcard";
    role_ok: boolean;
    role_score: number;

    year_gate: boolean;
    year_guess?: number | null;
    release_year?: number | null;
    year_score: number;

    era_start?: number | null;
    era_end?: number | null;
    era_gate_applied?: boolean;

    exists: boolean;
    exist_score: number;

    match_score: number;
    total_before_round: number;
  };
};

// ---- ユーティリティ ----
function norm(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function findResolvedRowDetailed(
  c: CandidateC,
  resolved: DResolved[]
): { row?: DResolved; kind: "exact" | "fuzzy" | "none" } {
  const t = norm((c as any)?.title);
  const a = norm((c as any)?.artist);

  // 1) 完全一致
  let row = resolved.find((r) => norm(r.title) === t && norm(r.artist) === a);
  if (row) return { row, kind: "exact" };

  // 2) タイトル一致 & アーティスト部分一致（表記ゆれ対策）
  row = resolved.find((r) => {
    const rt = norm(r.title);
    const ra = norm(r.artist);
    return (
      (rt === t || rt.startsWith(t) || t.startsWith(rt)) &&
      (ra.includes(a) || a.includes(ra))
    );
  });
  if (row) return { row, kind: "fuzzy" };

  return { kind: "none" };
}

// ===== スコア設計（popularity は不使用） =====
// ・存在確認（exists）: +0.40
// ・表記マッチ精度（exact / fuzzy）: +0.25 / +0.15
// ・年代一致（year_gate ON時）: +0.25（Era一致 または year_guess±1年一致）
// 合格閾値: 0.50
const EXIST_SCORE = 0.40;
const MATCH_SCORE_EXACT = 0.25;
const MATCH_SCORE_FUZZY = 0.15;
const YEAR_SCORE_ON_MATCH = 0.25;
const YEAR_TOLERANCE = 1;
const ACCEPT_THRESHOLD = 0.50;

type EvalOpts = {
  year_gate?: boolean;
  era?: { start: number; end: number } | null;
};

// === 本体 ===
export function evaluateTracks(
  _meta: RunMeta,
  candidates: CandidateC[],
  resolved: DResolved[],
  opts?: EvalOpts
): { picked: Evaluated[]; rejected: Evaluated[] } {
  // runId はログ用。無ければ "run"
  const runId =
    (typeof (_meta as any)?.runId === "string" && (_meta as any).runId) ||
    (typeof (_meta as any)?.id === "string" && (_meta as any).id) ||
    "run";

  // --- E 入口スナップ（挙動不変／失敗しても無視）
  try {
    const beforeIndexed = (candidates ?? []).map((c, i) => ({
      index: i,
      title: (c as any)?.title,
      artist: (c as any)?.artist,
      year_guess: (c as any)?.year_guess ?? (c as any)?.year ?? null,
      intended_role: (c as any)?.intended_role ?? null,
      popularity_hint: (c as any)?.popularity_hint ?? null,
    }));
    saveRunlog(runId, "E.picked.beforeAudit", { count: beforeIndexed.length });
    saveRunlog(runId, "E.picked.beforeAudit.indexed", beforeIndexed);
  } catch {}

  const picked: Evaluated[] = [];
  const rejected: Evaluated[] = [];

  const yearGate = !!(opts && (opts as any).year_gate);
  const era: { start: number; end: number } | null = (opts as any)?.era ?? null;

  for (const c of (candidates ?? [])) {
    const { row, kind } = findResolvedRowDetailed(c, resolved);

    // --- Spotify未解決 → 即 reject（既存挙動）
    if (!row || !row.spotify) {
      rejected.push({
        title: (c as any).title,
        artist: (c as any).artist,
        uri: null,
        confidence: 0,
        reason: "Spotifyで未解決",
        accepted: false,
        debug: {
          match_kind: "none",
          resolved_title: undefined,
          resolved_artist0: undefined,

          popularity: null,
          popularity_hint: (c as any)?.popularity_hint ?? undefined,
          popularity_score: 0,

          role: (c as any)?.intended_role ?? undefined,
          role_ok: true,
          role_score: 0,

          year_gate: yearGate,
          year_guess: (c as any)?.year_guess ?? (c as any)?.year ?? null,
          release_year: null,
          year_score: 0,
          era_start: era?.start ?? null,
          era_end: era?.end ?? null,
          era_gate_applied: !!era,

          exists: false,
          exist_score: 0,

          match_score: 0,
          total_before_round: 0,
        },
      });
      continue;
    }

    let conf = 0;
    const reasons: string[] = [];

    // ---- A) 存在確認
    const exists = !!row.spotify.id;
    const exist_score = exists ? EXIST_SCORE : 0;
    if (exists) {
      conf += EXIST_SCORE;
      reasons.push("Spotifyで実在確認済み");
    } else {
      reasons.push("Spotify未確認");
    }

    // ---- B) 表記マッチ
    let match_score = 0;
    if (kind === "exact") {
      conf += MATCH_SCORE_EXACT;
      match_score = MATCH_SCORE_EXACT;
      reasons.push("表記一致（exact）");
    } else if (kind === "fuzzy") {
      conf += MATCH_SCORE_FUZZY;
      match_score = MATCH_SCORE_FUZZY;
      reasons.push("表記一致（fuzzy）");
    } else {
      reasons.push("表記不一致");
    }

    // ---- C) 年代ゲート
    let year_score = 0;
    const yearGuess: number | null =
      (c as any)?.year_guess ?? (c as any)?.year ?? null;
    const release: number | null =
      (row.spotify as any)?.original_release_year ??
      row.spotify.release_year ??
      null;

    let hardReject = false;

    if (yearGate) {
      if (era && release != null) {
        if (release < era.start || release > era.end) {
          hardReject = true;
          reasons.push(`年代外（Era ${era.start}-${era.end}）`);
        } else {
          conf += YEAR_SCORE_ON_MATCH;
          year_score = YEAR_SCORE_ON_MATCH;
          reasons.push("Era一致");
        }
      } else if (yearGuess != null && release != null) {
        const diff = Math.abs(release - yearGuess);
        if (diff <= YEAR_TOLERANCE) {
          conf += YEAR_SCORE_ON_MATCH;
          year_score = YEAR_SCORE_ON_MATCH;
          reasons.push(`年代推定と一致（±${YEAR_TOLERANCE}年）`);
        } else {
          hardReject = true;
          reasons.push("年代推定とズレ（ハードゲート）");
        }
      } else {
        hardReject = true;
        reasons.push("年代情報不足（ゲートON時は不採用）");
      }
    } else {
      reasons.push("年代ゲートOFF");
    }

    if (hardReject) {
      const displayTitle =
        (row.spotify?.name && String(row.spotify.name)) || (c as any).title;
      const displayArtist =
        (Array.isArray(row.spotify?.artists) && row.spotify.artists[0]) ||
        (c as any).artist;
      
      const out: Evaluated = {
        title: displayTitle,
        artist: displayArtist,
        uri: row.spotify?.uri ?? null,
        confidence: conf,
        reason: reasons.join(" / "),
        accepted: false,
        debug: {
          match_kind: kind,
          resolved_title: row.spotify?.name,
          resolved_artist0: row.spotify?.artists?.[0],

          popularity: (row.spotify as any)?.popularity ?? null,
          popularity_hint: (c as any)?.popularity_hint ?? undefined,
          popularity_score: 0,

          role: (c as any)?.intended_role ?? undefined,
          role_ok: true,
          role_score: 0,

          year_gate: yearGate,
          year_guess: yearGuess,
          release_year: release,
          year_score,
          era_start: era?.start ?? null,
          era_end: era?.end ?? null,
          era_gate_applied: !!era,

          exists,
          exist_score,

          match_score,
          total_before_round: conf,
        },
      };
      rejected.push(out);
      continue;
    }

    // ---- D) 人気度（存在すれば弱寄与。関数が無ければ 0）
    let popularity_score = 0;
    const pop: number | null =
      typeof (row.spotify as any)?.popularity === "number"
        ? (row.spotify as any).popularity
        : null;
    if (pop != null) {
      try {
        if (typeof (POP_SCORE_FUNC as any) === "function") {
          popularity_score = Number((POP_SCORE_FUNC as any)(pop)) || 0;
        } else if (typeof (globalThis as any).POP_SCORE_FUNC === "function") {
          popularity_score = Number((globalThis as any).POP_SCORE_FUNC(pop)) || 0;
        }
      } catch {}
      conf += popularity_score;
      if (popularity_score) reasons.push(`人気度スコア(${pop})`);
    }

    // ---- E) 役割（既存寄与が別にあるなら委ねる／ここでは0寄与）
    const role = (c as any)?.intended_role ?? undefined;
    const role_ok = true;
    const role_score = 0;

    const out: Evaluated = {
      title: (c as any).title,
      artist: (c as any).artist,
      uri: row.spotify?.uri ?? null,
      confidence: Math.max(0, Math.round(conf)),
      reason: reasons.join(" / "),
      accepted: true,
      debug: {
        match_kind: kind,
        resolved_title: row.spotify?.name,
        resolved_artist0: row.spotify?.artists?.[0],

        popularity: pop,
        popularity_hint: (c as any)?.popularity_hint ?? undefined,
        popularity_score,

        role,
        role_ok,
        role_score,

        year_gate: yearGate,
        year_guess: yearGuess,
        release_year: release,
        year_score,
        era_start: era?.start ?? null,
        era_end: era?.end ?? null,
        era_gate_applied: !!era,

        exists,
        exist_score,

        match_score,
        total_before_round: conf,
      },
    };

    picked.push(out);
  } // for-of 終了

  // --- E 出口スナップ（挙動不変／失敗しても無視）
  try {
    const keyOf = (it: any) =>
      it?._key ||
      it?.spotify?.id ||
      (it?.title && it?.artist ? `${it.title}::${it.artist}` : null);

    const afterIndexed = picked.map((it, i) => ({
      index: i,
      key: keyOf(it),
      title: (it as any)?.title,
      artist: (it as any)?.artist,
      year: (it as any)?.debug?.release_year ?? null,
    }));

    saveRunlog(runId, "E.picked.afterAudit", { count: afterIndexed.length });
    saveRunlog(runId, "E.picked.afterAudit.indexed", afterIndexed);

    // ここでは “E内部の出口” なので説明目的で "picked" を記録
    saveRunlog(runId, "E.lineage", {
      usedForFinalize: "picked",
      beforeCount: (candidates ?? []).length,
      afterCount: afterIndexed.length,
    });
  } catch {}

  return { picked, rejected };
}
