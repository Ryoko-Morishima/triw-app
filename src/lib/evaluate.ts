// src/lib/evaluate.ts
import type { CandidateC } from "@/lib/openai";
import type { RunMeta } from "@/lib/runlog";

// D.json の resolved の想定型
type DResolved = {
  title: string;
  artist: string;
  year_guess?: number | null;
  intended_role?: "anchor" | "deep" | "wildcard";
  popularity_hint?: "high" | "mid" | "low"; // ← 互換のため残すが使わない
  spotify?: {
    id: string;
    uri: string;
    name: string;
    artists: string[];
    // 原盤年がある場合は original_release_year を優先
    release_year?: number | null;
    popularity?: number | null; // ← 互換のため残すが使わない
    preview_url?: string | null;
    album_image_url?: string | null;
    tempo?: number | null;
    energy?: number | null;

    // 型に無いことがあるので any で拾う
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

  // ★ デバッグ用（UI無視でOK）
  debug?: {
    match_kind: "exact" | "fuzzy" | "none";
    resolved_title?: string;
    resolved_artist0?: string;

    // ↓ 互換のために残すが常に未使用（0 / null）
    popularity?: number | null;
    popularity_hint?: "high" | "mid" | "low";
    popularity_score: number;

    role?: "anchor" | "deep" | "wildcard";
    role_ok: boolean;   // ← 互換のため true 固定（評価に使わない）
    role_score: number; // ← 常に 0（評価に使わない）

    year_gate: boolean;
    year_guess?: number | null;
    release_year?: number | null;
    year_score: number;

    // 追加: era ゲート情報
    era_start?: number | null;
    era_end?: number | null;
    era_gate_applied?: boolean;

    exists: boolean;
    exist_score: number;

    match_score: number; // 新規: 表記マッチの加点
    total_before_round: number;
  };
};

// ---- ユーティリティ ----
function norm(s: any) {
  return (s ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

/** 先頭 n 文字のバケットキー（fuzzy 範囲を限定して線形走査を極小化） */
function bucketKeyTitle(ntitle: string, n = 8) {
  return ntitle.slice(0, n);
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
  // 追加: 番組レベルで抽出した時代（十年単位など）
  era?: { start: number; end: number } | null;
};

/** ==== 事前インデックス化 ==== */
type ResIndexed = {
  exact: Map<string, DResolved>;                   // key: "<t>\u0001<a>"
  buckets: Map<string, { nt: string; na: string; row: DResolved }[]>; // key: bucket(title)
};

function buildResolvedIndex(resolved: DResolved[]): ResIndexed {
  const exact = new Map<string, DResolved>();
  const buckets = new Map<string, { nt: string; na: string; row: DResolved }[]>();

  for (const r of resolved) {
    const nt = norm(r.title);
    const na = norm(r.artist);
    const key = nt + "\u0001" + na;
    if (!exact.has(key)) exact.set(key, r);

    const b = bucketKeyTitle(nt);
    const arr = buckets.get(b) ?? [];
    arr.push({ nt, na, row: r });
    buckets.set(b, arr);
  }
  return { exact, buckets };
}

function findResolvedRowDetailedFast(
  c: CandidateC,
  idx: ResIndexed
): { row?: DResolved; kind: "exact" | "fuzzy" | "none" } {
  const t = norm((c as any)?.title);
  const a = norm((c as any)?.artist);

  // 1) exact: タイトル & アーティスト完全一致
  const exactKey = t + "\u0001" + a;
  const exactHit = idx.exact.get(exactKey);
  if (exactHit) return { row: exactHit, kind: "exact" };

  // 2) fuzzy: 同バケット（タイトル先頭8文字一致）内だけを走査
  const bucket = bucketKeyTitle(t);
  const cand = idx.buckets.get(bucket);
  if (cand && cand.length) {
    // 元コードの条件:
    // (rt === t || rt.startsWith(t) || t.startsWith(rt)) &&
    // (ra.includes(a) || a.includes(ra))
    for (const r of cand) {
      const rt = r.nt;
      const ra = r.na;
      const titleOk = rt === t || rt.startsWith(t) || t.startsWith(rt);
      const artistOk = ra.includes(a) || a.includes(ra);
      if (titleOk && artistOk) return { row: r.row, kind: "fuzzy" };
    }
  }

  return { kind: "none" };
}

export function evaluateTracks(
  _meta: RunMeta,
  candidates: CandidateC[],
  resolved: DResolved[],
  opts?: EvalOpts
): { picked: Evaluated[]; rejected: Evaluated[] } {
  const picked: Evaluated[] = [];
  const rejected: Evaluated[] = [];

  // スイッチ
  const yearGate = !!(opts && opts.year_gate);
  const era = opts?.era ?? null; // 例: {start:1990, end:1999}

  // ★ ここが高速化のキモ：resolved を一度だけインデックス化
  const resIndex = buildResolvedIndex(resolved);

  for (const c of candidates) {
    const { row, kind } = findResolvedRowDetailedFast(c, resIndex);
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

    // ---- A) 存在確認（最優先）
    const exists = !!row.spotify.id;
    if (exists) {
      conf += EXIST_SCORE;
      reasons.push("Spotifyで実在確認済み");
    }
    const exist_score = exists ? EXIST_SCORE : 0;

    // ---- B) 表記マッチ（exact / fuzzy）
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

    // ---- C) 年代（ゲートON時は“ハード制約”）
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
        // Era 指定がある場合：範囲外は即不採用
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
          // Era 情報が無いケースは year_guess を厳格ゲートに使う
          hardReject = true;
          reasons.push("年代推定とズレ（ハードゲート）");
        }
      } else {
        // 判定材料が不足：ゲートONのときは安全側で reject
        hardReject = true;
        reasons.push("年代情報不足（ゲートON時は不採用）");
      }
    } else {
      reasons.push("年代ゲートOFF");
    }

    // ---- 互換: role/popularity は評価に使わない（0固定）
    const role = (c as any)?.intended_role ?? undefined;

    const total_before_round = conf;
    let confidence = Number(conf.toFixed(2));
    let accepted = confidence >= ACCEPT_THRESHOLD;

    // ★ ハードゲート最終判定
    if (hardReject) {
      accepted = false;
      confidence = Math.min(confidence, 0.49); // 閾値未満を明示
    }

    const out: Evaluated = {
      title: (c as any).title,
      artist: (c as any).artist,
      uri: row.spotify.uri ?? null,
      confidence,
      reason: reasons.join(" / "),
      accepted,
      debug: {
        match_kind: kind,
        resolved_title: row.spotify?.name ?? undefined,
        resolved_artist0: row.spotify?.artists?.[0] ?? undefined,

        popularity: null,
        popularity_hint: (c as any)?.popularity_hint ?? undefined,
        popularity_score: 0,

        role,
        role_ok: true,
        role_score: 0,

        year_gate: yearGate,
        year_guess: yearGuess ?? null,
        release_year: release ?? null,
        year_score,

        era_start: era?.start ?? null,
        era_end: era?.end ?? null,
        era_gate_applied: !!era,

        exists,
        exist_score,

        match_score,
        total_before_round,
      },
    };

    if (accepted) picked.push(out);
    else rejected.push(out);
  }

  return { picked, rejected };
}
