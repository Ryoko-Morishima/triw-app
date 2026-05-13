import type { ProgramEvaluatedTrack } from "@/lib/triw/program/types";

type EraRange = { start: number; end: number };

type Input = {
  popularity?: number; // 0-100
  era?: number; // 0-100 slider
  decade?: string; // 互換用: "1990s"
};

function decadeToEra(decade?: string): EraRange | null {
  if (!decade) return null;

  const start = Number(String(decade).replace("s", ""));
  if (!Number.isFinite(start)) return null;

  return { start, end: start + 9 };
}

/**
 * era slider をざっくり年代レンジに変換する。
 * 中央付近は年代条件なし。
 *
 * 0   -> 1960s以前寄り
 * 25  -> 1980s
 * 50  -> neutral
 * 75  -> 2000s
 * 100 -> 2020s寄り
 */
function eraSliderToRange(era?: number): EraRange | null {
  if (era == null || !Number.isFinite(era)) return null;

  // ニュートラル帯。ここは選曲条件にしない。
  if (era >= 45 && era <= 55) return null;

  if (era < 15) return { start: 1950, end: 1974 };
  if (era < 30) return { start: 1970, end: 1989 };
  if (era < 45) return { start: 1980, end: 1999 };
  if (era <= 70) return { start: 1990, end: 2010 };
  if (era <= 85) return { start: 2000, end: 2020 };
  return { start: 2015, end: 2026 };
}

function getEraRange(input: Input): EraRange | null {
  return eraSliderToRange(input.era) ?? decadeToEra(input.decade);
}

function getTrackObject(item: any) {
  return item?.track ?? item?.spotify ?? item;
}

function getTitle(item: any, track: any) {
  return item?.title ?? track?.name ?? track?.title ?? "タイトル不明";
}

function getArtist(item: any, track: any) {
  return (
    item?.artist ??
    track?.artists?.[0]?.name ??
    track?.artist ??
    "アーティスト不明"
  );
}

function getUri(track: any) {
  return track?.uri ?? null;
}

function getPopularity(item: any, track: any) {
  return track?.popularity ?? item?.popularity ?? null;
}

function getYear(item: any, track: any) {
  const releaseDate =
    track?.album?.release_date ??
    item?.release_date ??
    item?.release_year ??
    null;

  if (typeof releaseDate === "number") return releaseDate;

  if (typeof releaseDate === "string" && releaseDate.length >= 4) {
    const year = Number(releaseDate.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }

  return null;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToConfidence(score: number) {
  return Math.max(0.1, Math.min(1, Math.round((score / 100) * 100) / 100));
}

export function evaluateTuneTracks(
  tracks: any[],
  input: Input
): {
  tracks: ProgramEvaluatedTrack[];
  reservePool: ProgramEvaluatedTrack[];
  rejected: ProgramEvaluatedTrack[];

  // 既存 route.ts などの互換用。あとで消してよい。
  picked: ProgramEvaluatedTrack[];
} {
  const evaluatedTracks: ProgramEvaluatedTrack[] = [];

  const eraRange = getEraRange(input);
  const inputPop = input.popularity ?? 50;
  const usePopularity = inputPop < 45 || inputPop > 55;

  for (const item of tracks ?? []) {
    const track = getTrackObject(item);

    const title = getTitle(item, track);
    const artist = getArtist(item, track);
    const uri = getUri(track);
    const pop = getPopularity(item, track);
    const year = getYear(item, track);

    let score = 70;
    let state: "reserve" | "rejected" = "reserve";
    const reasons: string[] = [];

    if (!uri) {
      score -= 70;
      state = "rejected";
      reasons.push("Spotify未解決");
    } else {
      score += 10;
      reasons.push("Spotify解決済み");
    }

    if (state !== "rejected" && eraRange && year != null) {
      if (year < eraRange.start || year > eraRange.end) {
        score -= 35;
        reasons.push(`年代ズレ（${year} / 目安 ${eraRange.start}-${eraRange.end}）`);
      } else {
        score += 10;
        reasons.push(`年代一致（${year}）`);
      }
    } else if (state !== "rejected" && eraRange && year == null) {
      score -= 5;
      reasons.push("年代不明");
    } else if (state !== "rejected") {
      reasons.push("年代条件なし");
    }

    if (state !== "rejected" && usePopularity && pop != null) {
      if (inputPop < 30 && pop > 80) {
        score -= 30;
        reasons.push(`人気傾向が高すぎ（${pop}）`);
      } else if (inputPop > 70 && pop < 35) {
        score -= 25;
        reasons.push(`人気傾向が低すぎ（${pop}）`);
      } else {
        score += 8;
        reasons.push(`人気傾向OK（${pop}）`);
      }
    } else if (state !== "rejected" && usePopularity) {
      score -= 3;
      reasons.push("人気傾向不明");
    } else if (state !== "rejected") {
      reasons.push("人気傾向条件なし");
    }

    score = clampScore(score);

    if (score < 40) {
      state = "rejected";
    }

    const accepted = state !== "rejected";

    const evaluated: ProgramEvaluatedTrack = {
      title,
      artist,
      uri: uri ?? undefined,

      score,
      state,
      reasons,
      reason: reasons.join(" / "),

      // finalize.ts 互換用
      accepted,
      confidence: scoreToConfidence(score),

      debug: {
        popularity: pop,
        year,
        uri,
        role: item?.debug?.role ?? item?.role ?? "unknown",
      },
    };

    evaluatedTracks.push(evaluated);
  }

  const reservePool = evaluatedTracks
    .filter((track) => track.state === "reserve")
    .sort((a, b) => b.score - a.score);

  const rejected = evaluatedTracks
    .filter((track) => track.state === "rejected")
    .sort((a, b) => b.score - a.score);

  return {
    tracks: evaluatedTracks,
    reservePool,
    rejected,

    // 互換用
    picked: reservePool,
  };
}