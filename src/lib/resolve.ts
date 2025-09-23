// src/lib/resolve.ts
import {
  requireSpotifyToken,
  searchTrackBestEffort,
  getTrack,
  getAudioFeatures,
  releaseYearFrom,
  searchTracksByISRC,
} from "@/lib/spotify";
import type { CandidateC } from "@/lib/openai";

type ResolvedRow = {
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
    release_year?: number | null;             // その盤の年
    original_release_year?: number | null;    // ISRCクラスターからの最古年（原盤年推定）
    is_reissue?: boolean | null;              // 原盤年と違えば true
    popularity?: number | null;
    preview_url?: string | null;
    album_image_url?: string | null;
    tempo?: number | null;
    energy?: number | null;
  };
};

export async function resolveCandidatesD(
  candidates: CandidateC[]
): Promise<{ resolved: ResolvedRow[]; notFound: { title: string; artist: string }[] }> {
  const token = await requireSpotifyToken();

  const resolved: ResolvedRow[] = [];
  const notFound: { title: string; artist: string }[] = [];

  // 1) まずIDを確定
  const hits = await Promise.all(
    candidates.map(async (c) => {
      const best = await searchTrackBestEffort(token, c.title, c.artist, c.year_guess ?? null);
      return { c, best };
    })
  );

  // 2) 詳細（popularity/preview/album.images/release_date/ISRC）を並列取得
  const found = hits.filter((h) => !!h.best) as {
    c: CandidateC;
    best: { id: string; uri: string; name: string; artists: string[] };
  }[];
  const ids = found.map((h) => h.best.id);

  const trackJsons = await Promise.all(ids.map((id) => getTrack(token, id)));
  const byId: Record<string, any> = {};
  trackJsons.forEach((t: any) => (byId[t.id] = t));

  // 3) ISRCクラスターを検索して「最古年（原盤年推定）」を導出
  const originalYearById: Record<string, number | null> = {};
  await Promise.all(
    trackJsons.map(async (t: any) => {
      const isrc: string | undefined = t?.external_ids?.isrc;
      if (!isrc) {
        originalYearById[t.id] = null;
        return;
      }
      try {
        const js = await searchTracksByISRC(token, isrc);
        const items = (js?.tracks?.items ?? []) as any[];
        let minYear: number | null = null;
        for (const it of items) {
          const y = releaseYearFrom(it?.album?.release_date);
          if (y && (minYear === null || y < minYear)) minYear = y;
        }
        originalYearById[t.id] = minYear ?? null;
      } catch {
        originalYearById[t.id] = null;
      }
    })
  );

  // 4) audio features（tempo/energy）
  let featById: Record<string, any> = {};
  try {
    const feats = await getAudioFeatures(token, ids);
    featById = (feats?.audio_features ?? []).reduce((acc: any, f: any) => {
      if (f?.id) acc[f.id] = f;
      return acc;
    }, {});
  } catch {
    // 取れなくても続行
  }

  // 5) マッピング
  for (const { c, best } of hits) {
    if (!best) {
      notFound.push({ title: c.title, artist: c.artist });
      continue;
    }
    const t = byId[best.id];
    const f = featById[best.id] || {};
    const release_year =
      releaseYearFrom(t?.album?.release_date) ??
      (typeof (t as any)?.release_year === "number" ? (t as any).release_year : null);

    const orig = originalYearById[best.id] ?? null;
    const album_image_url =
      Array.isArray(t?.album?.images) && t.album.images.length ? t.album.images[0]?.url ?? null : null;

    resolved.push({
      title: c.title,
      artist: c.artist,
      year_guess: c.year_guess ?? null,
      intended_role: (c as any).intended_role,
      popularity_hint: (c as any).popularity_hint,
      spotify: {
        id: best.id,
        uri: best.uri,
        name: t?.name ?? best.name,
        artists: best.artists,
        release_year,
        original_release_year: orig,
        is_reissue: !!(orig && release_year && orig !== release_year),
        popularity: typeof t?.popularity === "number" ? t.popularity : null,
        preview_url: t?.preview_url ?? null,
        album_image_url,
        tempo: typeof f?.tempo === "number" ? f.tempo : null,
        energy: typeof f?.energy === "number" ? f.energy : null,
      },
    });
  }

  return { resolved, notFound };
}
