// src/lib/resolve.ts
import {
  requireSpotifyToken,
  searchTrackBestEffort,
  getTrack,
  getAudioFeatures,
  releaseYearFrom,
  searchTracksByISRC,
} from "@/lib/spotify";

export type ResolveCandidate = {
  title: string;
  artist: string;
  year_guess?: number | null;
};

function normalizeForMatch(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ===========================================
 *  補助: MusicBrainz から ISRC で原盤年の最古候補を取得（任意）
 *  - ORIGIN_MB_ENABLE が truthy のときだけ実行
 *  - 失敗時は静かに null
 * =========================================== */
async function originYearFromMusicBrainzByISRC(
  isrc: string
): Promise<number | null> {
  try {
    if (!process.env.ORIGIN_MB_ENABLE) return null;

    const url = `https://musicbrainz.org/ws/2/recording?query=isrc:${encodeURIComponent(
      isrc
    )}&fmt=json`;

    const res = await fetch(url, {
      headers: { "User-Agent": "TRIW/0.1 (year-origin-check)" },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const js: any = await res.json();

    let minYear: number | null = null;

    const recs = Array.isArray(js?.recordings)
      ? js.recordings
      : [];

    for (const r of recs) {
      const releases = Array.isArray(r?.releases)
        ? r.releases
        : [];

      for (const rel of releases) {
        const d: string | undefined = rel?.date;
        if (!d) continue;

        const m = /^\d{4}/.exec(d);
        if (!m) continue;

        const y = Number(m[0]);

        if (y >= 1900 && y <= 2100) {
          if (minYear === null || y < minYear) {
            minYear = y;
          }
        }
      }
    }

    return minYear;
  } catch {
    return null;
  }
}

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

    // その盤の年
    release_year?: number | null;

    // 原盤年推定
    original_release_year?: number | null;

    // 原盤年と違えば true
    is_reissue?: boolean | null;

    popularity?: number | null;
    preview_url?: string | null;
    album_image_url?: string | null;

    tempo?: number | null;
    energy?: number | null;

    match?: {
      candidate_title: string;
      candidate_artist: string;

      resolved_name: string;
      resolved_artists: string[];

      title_exact: boolean;
      title_contains: boolean;
      artist_exact: boolean;
    };
  };
};

export async function resolveCandidatesD(
  candidates: ResolveCandidate[]
): Promise<{
  resolved: ResolvedRow[];
  notFound: { title: string; artist: string }[];
}> {
  const token = await requireSpotifyToken();

  const resolved: ResolvedRow[] = [];

  const notFound: {
    title: string;
    artist: string;
  }[] = [];

  // 1) まずIDを確定
  const hits = await Promise.all(
    candidates.map(async (c) => {
      const best = await searchTrackBestEffort(
        token,
        c.title,
        c.artist,
        c.year_guess ?? null
      );

      return { c, best };
    })
  );

  // 2) 詳細取得
  const found = hits.filter((h) => !!h.best) as {
    c: ResolveCandidate;
    best: {
      id: string;
      uri: string;
      name: string;
      artists: string[];
    };
  }[];

  const ids = found.map((h) => h.best.id);

  const trackJsons = await Promise.all(
    ids.map((id) => getTrack(token, id))
  );

  const byId: Record<string, any> = {};

  trackJsons.forEach((t: any) => {
    byId[t.id] = t;
  });

  // 3) ISRCクラスター検索
  const originalYearById: Record<string, number | null> = {};

  await Promise.all(
    trackJsons.map(async (t: any) => {
      const isrc: string | undefined =
        t?.external_ids?.isrc;

      if (!isrc) {
        originalYearById[t.id] = null;
        return;
      }

      try {
        const js = await searchTracksByISRC(token, isrc);

        const items = (js?.tracks?.items ?? []) as any[];

        let minYear: number | null = null;

        for (const it of items) {
          const y = releaseYearFrom(
            it?.album?.release_date
          );

          if (y && (minYear === null || y < minYear)) {
            minYear = y;
          }
        }

        // MusicBrainz も参照
        const mbYear =
          await originYearFromMusicBrainzByISRC(isrc);

        if (
          mbYear &&
          (minYear === null || mbYear < minYear)
        ) {
          minYear = mbYear;
        }

        originalYearById[t.id] = minYear ?? null;
      } catch {
        originalYearById[t.id] = null;
      }
    })
  );

  // 4) audio features
  let featById: Record<string, any> = {};

  try {
    const feats = await getAudioFeatures(token, ids);

    featById = (
      feats?.audio_features ?? []
    ).reduce((acc: any, f: any) => {
      if (f?.id) acc[f.id] = f;
      return acc;
    }, {});
  } catch {
    // 続行
  }

  // 5) マッピング
  for (const { c, best } of hits) {
    if (!best) {
      notFound.push({
        title: c.title,
        artist: c.artist,
      });

      continue;
    }

    const t = byId[best.id];

    const f = featById[best.id] || {};

    const release_year =
      releaseYearFrom(t?.album?.release_date) ??
      (typeof (t as any)?.release_year === "number"
        ? (t as any).release_year
        : null);

    const orig =
      originalYearById[best.id] ?? null;

    const album_image_url =
      Array.isArray(t?.album?.images) &&
      t.album.images.length
        ? t.album.images[0]?.url ?? null
        : null;

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

        is_reissue: !!(
          orig &&
          release_year &&
          orig !== release_year
        ),

        popularity:
          typeof t?.popularity === "number"
            ? t.popularity
            : null,

        preview_url: t?.preview_url ?? null,

        album_image_url,

        tempo:
          typeof f?.tempo === "number"
            ? f.tempo
            : null,

        energy:
          typeof f?.energy === "number"
            ? f.energy
            : null,

        match: {
          candidate_title: c.title,
          candidate_artist: c.artist,

          resolved_name: t?.name ?? best.name,
          resolved_artists: best.artists,

          title_exact:
            normalizeForMatch(c.title) ===
            normalizeForMatch(
              t?.name ?? best.name
            ),

          title_contains:
            normalizeForMatch(
              t?.name ?? best.name
            ).includes(
              normalizeForMatch(c.title)
            ) ||
            normalizeForMatch(c.title).includes(
              normalizeForMatch(
                t?.name ?? best.name
              )
            ),

          artist_exact:
            best.artists
              .map(normalizeForMatch)
              .includes(
                normalizeForMatch(c.artist)
              ),
        },
      },
    });
  }

  return { resolved, notFound };
}
