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

function normTitle(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\s*\(.*?(remaster|remastered|live|acoustic|edit|version).*?\)\s*/g, "")
    .replace(/\s*-\s*(remaster|remastered|live|acoustic|edit|version).*?$/g, "")
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

export async function searchTrackBestEffort(
  token: string,
  titleRaw: string,
  artistRaw: string
): Promise<FoundTrack | null> {
  const t0 = normTitle(titleRaw);
  const a0 = normArtist(artistRaw);

  // Try1: 厳密（ANDクエリ + from_token）
  const q1 = `type=track&limit=10&market=from_token&q=${encodeURIComponent(`track:"${titleRaw}" artist:"${artistRaw}"`)}`;
  const hit1 = await pick(token, q1, t0, a0);
  if (hit1) return hit1;

  // Try2: 正規化後
  const q2 = `type=track&limit=10&market=from_token&q=${encodeURIComponent(`track:"${t0}" artist:"${a0}"`)}`;
  const hit2 = await pick(token, q2, t0, a0);
  if (hit2) return hit2;

  // Try3: タイトル+アーティストの素検索（引用なし）
  const q3 = `type=track&limit=20&market=from_token&q=${encodeURIComponent(`${titleRaw} ${artistRaw}`)}`;
  const hit3 = await pickLoose(token, q3, t0, a0);
  if (hit3) return hit3;

  // Try4: タイトル単独検索→アーティストのトークン重なりで最大を選ぶ
  const q4 = `type=track&limit=20&market=from_token&q=${encodeURIComponent(titleRaw)}`;
  const hit4 = await pickBestByArtistOverlap(token, q4, t0, a0);
  if (hit4) return hit4;

  return null;
}

async function pick(token: string, query: string, t0: string, a0: string): Promise<FoundTrack | null> {
  const json = await sFetch(`/search?${query}`, token);
  const items = (json?.tracks?.items ?? []) as any[];
  for (const it of items) {
    const nt = normTitle(it.name);
    const na = normArtist((it.artists?.[0]?.name ?? "") as string);
    if ((nt === t0 || nt.startsWith(t0) || t0.startsWith(nt)) && (na === a0 || a0.includes(na) || na.includes(a0))) {
      return { id: it.id, uri: it.uri, name: it.name, artists: it.artists.map((x: any) => x.name) };
    }
  }
  return null;
}
async function pickLoose(token: string, query: string, t0: string, a0: string): Promise<FoundTrack | null> {
  const json = await sFetch(`/search?${query}`, token);
  const items = (json?.tracks?.items ?? []) as any[];
  for (const it of items) {
    const nt = normTitle(it.name);
    const na = normArtist((it.artists?.[0]?.name ?? "") as string);
    if ((nt.includes(t0) || t0.includes(nt)) && (na === a0 || a0.includes(na) || na.includes(a0))) {
      return { id: it.id, uri: it.uri, name: it.name, artists: it.artists.map((x: any) => x.name) };
    }
  }
  return null;
}
async function pickBestByArtistOverlap(token: string, query: string, t0: string, a0: string): Promise<FoundTrack | null> {
  const json = await sFetch(`/search?${query}`, token);
  const items = (json?.tracks?.items ?? []) as any[];
  const at = tokenSet(a0);
  let best: any = null;
  let bestScore = 0;
  for (const it of items) {
    const nt = normTitle(it.name);
    if (!(nt === t0 || nt.startsWith(t0) || t0.startsWith(nt))) continue;
    const na = tokenSet(normArtist((it.artists?.[0]?.name ?? "") as string));
    const score = overlap(at, na);
    if (score > bestScore) { best = it; bestScore = score; }
  }
  return best ? { id: best.id, uri: best.uri, name: best.name, artists: best.artists.map((x: any) => x.name) } : null;
}

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
