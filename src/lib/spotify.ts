// src/lib/spotify.ts
export const runtime = "nodejs";
import { cookies } from "next/headers";

const SPOTIFY_API = "https://api.spotify.com/v1";

export async function requireSpotifyToken(): Promise<string> {
  const jar = await cookies();
  const token = jar.get("spotify_access_token")?.value;
  if (!token) throw new Error("Spotifyトークンが見つかりません（ログインしてください）");
  return token;
}

async function sFetch(path: string, token: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${SPOTIFY_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }
  return res.json();
}

export type FoundTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
};

export async function getMe(token: string) {
  return sFetch("/me", token);
}

// ---------- 正規化 & ユーティリティ ----------
function normTitle(s: string) {
  return (s || "")
    .toLowerCase()
    // カッコ内のRemix/Version系は落とす（副題は可能な限り保持）
    .replace(/\s*\(([^)]*?(remaster|remastered|live|acoustic|edit|version|remix|re[-\s]?recorded)[^)]*?)\)\s*/gi, " ")
    .replace(/\s*-\s*(remaster|remastered|live|acoustic|edit|version|remix|re[-\s]?recorded).*?$/gi, "")
    .replace(/[“”"’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function normArtist(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+feat\.?\s.+$/i, "")
    .replace(/\s+ft\.?\s.+$/i, "")
    .replace(/[“”"’']/g, "")
    .trim();
}
function tokenSet(s: string) {
  return new Set(s.split(/\s+/).filter(Boolean));
}
function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}
function releaseYearFrom(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^\d{4}/);
  return m ? Number(m[0]) : null;
}
export { releaseYearFrom };

// ---------- スコアリング（オリジナル優先 / エイリアス無し） ----------
function artistScore(candArtists: string[], targetArtistRaw: string): { exact: boolean; score: number } {
  const target = normArtist(targetArtistRaw);
  const targetTok = tokenSet(target);
  let partial = 0;
  for (const a of candArtists) {
    const na = normArtist(a);
    if (na === target || na.includes(target) || target.includes(na)) {
      return { exact: true, score: 2 };
    }
    const sc = overlap(tokenSet(na), targetTok);
    if (sc > 0) partial = 1;
  }
  return { exact: false, score: partial };
}

// タイトル一致: 2=完全一致 / 1.5=部分一致（含む） / 1=前方・後方一致 / 0=不一致
function titleMatchScore(candTitle: string, targetTitleNorm: string): number {
  const nt = normTitle(candTitle);
  if (!targetTitleNorm) return 0;
  if (nt === targetTitleNorm) return 2;
  if (nt.startsWith(targetTitleNorm) || targetTitleNorm.startsWith(nt)) return 1;
  if (nt.includes(targetTitleNorm) || targetTitleNorm.includes(nt)) return 1.5;
  return 0;
}

function yearProximityScore(candYear: number | null, yearGuess?: number | null): number {
  if (!candYear || !yearGuess) return 0;
  const d = Math.abs(candYear - yearGuess);
  if (d <= 3) return 3;
  if (d <= 6) return 2;
  if (d <= 10) return 1;
  return 0;
}

function looksLikeCoverOrRemix(name?: string | null): boolean {
  const s = String(name || "");
  const en = /\b(remix|cover|tribute|mix|re[-\s]?recorded)\b/i;
  const ja = /(カバー|リミックス|ベスト|トリビュート)/;
  return en.test(s) || ja.test(s);
}

function coverPenalty(cand: any, targetArtistRaw: string, yearGuess?: number | null): number {
  const artists = (cand.artists || []).map((a: any) => a.name);
  const aScore = artistScore(artists, targetArtistRaw);
  const artistExact = aScore.exact;
  const y = releaseYearFrom(cand?.album?.release_date);
  const yearDiff = yearGuess && y ? Math.abs(y - yearGuess) : null;
  const nameBad = looksLikeCoverOrRemix(cand?.name) || looksLikeCoverOrRemix(cand?.album?.name);

  let pen = 0;
  if (!artistExact) pen -= 4;
  if (nameBad) pen -= 5;
  if (!artistExact && yearDiff !== null) {
    if (yearDiff >= 15) pen -= 3;
    else if (yearDiff >= 10) pen -= 2;
  }
  return pen;
}

function scoreOne(
  it: any,
  titleNorm: string,
  targetArtistRaw: string,
  yearGuess?: number | null,
  requireTitle: boolean = true
): number {
  const tScore = titleMatchScore(it.name, titleNorm);
  if (requireTitle && tScore === 0) return Number.NEGATIVE_INFINITY;

  const artists = (it.artists || []).map((a: any) => a.name);
  const aMeta = artistScore(artists, targetArtistRaw);
  const y = releaseYearFrom(it?.album?.release_date);
  const yScore = yearProximityScore(y, yearGuess ?? null);
  const pop = typeof it?.popularity === "number" ? it.popularity : 0;
  const pen = coverPenalty(it, targetArtistRaw, yearGuess ?? null);

  return (
    (tScore || 0) * 3 +
    aMeta.score * 4 +
    yScore * 5 +
    pop / 200 +
    pen
  );
}

function rerankCandidatesStrict(
  items: any[],
  titleNorm: string,
  targetArtistRaw: string,
  yearGuess?: number | null
): any | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  let best: any = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const it of items) {
    const s = scoreOne(it, titleNorm, targetArtistRaw, yearGuess, true);
    if (s > bestScore) {
      best = it;
      bestScore = s;
    }
  }
  return bestScore === Number.NEGATIVE_INFINITY ? null : best;
}

function rerankCandidatesLoose(
  items: any[],
  titleNorm: string,
  targetArtistRaw: string,
  yearGuess?: number | null
): any | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  let best: any = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const it of items) {
    const s = scoreOne(it, titleNorm, targetArtistRaw, yearGuess, false);
    if (s > bestScore) {
      best = it;
      bestScore = s;
    }
  }
  return best;
}

// ---------- 検索（クエリ多段 + 再ランキング + フォールバック） ----------
export async function searchTrackBestEffort(
  token: string,
  titleRaw: string,
  artistRaw: string,
  yearGuess?: number | null
): Promise<FoundTrack | null> {
  const t0 = normTitle(titleRaw);

  async function searchPick(q: string): Promise<FoundTrack | null> {
    const json = await sFetch(`/search?${q}`, token);
    const items = (json?.tracks?.items ?? []) as any[];
    let best = rerankCandidatesStrict(items, t0, artistRaw, yearGuess);
    if (!best) best = rerankCandidatesLoose(items, t0, artistRaw, yearGuess);
    if (!best) return null;
    return { id: best.id, uri: best.uri, name: best.name, artists: best.artists.map((x: any) => x.name) };
  }

  const queries: string[] = [
    `type=track&limit=20&market=from_token&q=${encodeURIComponent(`track:"${titleRaw}" artist:"${artistRaw}"`)}`,
    `type=track&limit=20&market=from_token&q=${encodeURIComponent(`track:"${t0}" artist:"${artistRaw}"`)}`,
    `type=track&limit=20&market=from_token&q=${encodeURIComponent(`${titleRaw} ${artistRaw}`)}`,
    `type=track&limit=20&market=from_token&q=${encodeURIComponent(titleRaw)}`,
    `type=track&limit=20&market=JP&q=${encodeURIComponent(titleRaw)}`,
    `type=track&limit=20&q=${encodeURIComponent(titleRaw)}`,
    `type=track&limit=20&q=${encodeURIComponent(t0)}`,
  ];

  for (const q of queries) {
    const hit = await searchPick(q);
    if (hit) return hit;
  }
  return null;
}

// ---------- ★ 追加：ISRC 検索 ----------
/**
 * 指定した ISRC を持つトラックを Spotify 検索APIで取得します。
 * resolve.ts 側は { tracks: { items: [...] } } 形式を想定しているため、
 * 生の検索レスポンスをそのまま返します。
 */
export async function searchTracksByISRC(
  token: string,
  isrc: string,
  limit: number = 50
): Promise<any> {
  const q = `type=track&market=from_token&limit=${Math.max(1, Math.min(limit, 50))}&q=${encodeURIComponent(`isrc:${isrc}`)}`;
  return sFetch(`/search?${q}`, token);
}

// ---------- プレイリスト ----------
export async function createPlaylist(token: string, userId: string, name: string, description: string) {
  return sFetch(`/users/${encodeURIComponent(userId)}/playlists`, token, {
    method: "POST",
    body: JSON.stringify({ name, description, public: false }),
  });
}

export async function addTracks(token: string, playlistId: string, uris: string[]) {
  if (uris.length === 0) return;
  await sFetch(`/playlists/${encodeURIComponent(playlistId)}/tracks`, token, {
    method: "POST",
    body: JSON.stringify({ uris }),
  });
}

// ---------- 詳細取得 / Audio Features ----------
export async function getTrack(token: string, trackId: string) {
  return sFetch(`/tracks/${encodeURIComponent(trackId)}`, token);
}

export async function getAudioFeatures(token: string, ids: string[]) {
  if (!ids || ids.length === 0) return { audio_features: [] };
  const q = ids.map(encodeURIComponent).join(",");
  return sFetch(`/audio-features?ids=${q}`, token);
}
