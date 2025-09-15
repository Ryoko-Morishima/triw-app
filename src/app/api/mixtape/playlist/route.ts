// src/app/api/mixtape/playlist/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveRaw } from "@/lib/runlog";

type Arc = "intro" | "build" | "peak" | "cooldown" | "other";

type Candidate = {
  title: string;
  artist: string;
  album?: string | null;
  arc?: Arc;
  year_guess?: number | null;
  reason?: string;
  whyPersonaFit?: string;
  whyThemeFit?: string;
};

type ResolvedTrack = {
  title: string;
  artist: string;
  album: string | null;
  arc: Arc;
  year_guess: number | null;
  spotify: null | {
    id: string;
    uri: string;
    name: string;
    artists: string[];
    popularity: number;
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickByArc(resolved: ResolvedTrack[], targetCount: number) {
  const buckets: Record<Arc, ResolvedTrack[]> = {
    intro: [],
    build: [],
    peak: [],
    cooldown: [],
    other: [],
  };
  for (const r of resolved) {
    buckets[(r.arc ?? "other") as Arc].push(r);
  }
  const plan: [Arc, number][] = [
    ["intro", 1],
    ["build", 2],
    ["peak", 3],
    ["cooldown", 1],
    ["other", 999],
  ];
  const out: ResolvedTrack[] = [];
  let remain = targetCount;
  for (const [k, want] of plan) {
    if (remain <= 0) break;
    const take = Math.min(want, buckets[k].length, remain);
    out.push(...buckets[k].slice(0, take));
    remain -= take;
  }
  if (remain > 0) {
    const flat = Object.values(buckets).flat();
    for (const r of flat) {
      if (out.includes(r)) continue;
      out.push(r);
      if (--remain <= 0) break;
    }
  }
  return out.slice(0, targetCount);
}

/** ---------------- Spotify Web API helpers ---------------- **/

// 検索：失敗理由を見える化（401/403/429は例外に）、かつフォールバック検索。
// market は JP 固定（from_token 由来の403を避ける）
async function spSearchTrack(token: string, title: string, artist: string) {
  const run = async (qRaw: string) => {
    const params = new URLSearchParams({
      q: qRaw,
      type: "track",
      limit: "1",
      market: "JP",
    });
    const r = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (r.status === 401 || r.status === 403) {
      const t = await r.text().catch(() => "");
      throw new Error(`SPOTIFY_AUTH_ERROR ${r.status}: ${t || "(no body)"}`);
    }
    if (r.status === 429) {
      const retry = r.headers.get("Retry-After") || "";
      throw new Error(`SPOTIFY_RATE_LIMIT 429 Retry-After=${retry}`);
    }
    if (!r.ok) return null; // その他は「単にヒットしなかった」

    const j = await r.json().catch(() => null);
    return j?.tracks?.items?.[0] ?? null;
  };

  // フォールバック順：曲名のみ → 曲名+アーティスト → 厳密フィールド
  let item =
    (await run(`${title}`)) ||
    (await run(`${title} ${artist}`)) ||
    (await run(`track:${JSON.stringify(title)} artist:${JSON.stringify(artist)}`));

  if (!item) return null;

  return {
    id: item.id as string,
    uri: item.uri as string,
    name: item.name as string,
    artists: (item.artists ?? []).map((a: any) => a.name as string),
    popularity: (item.popularity ?? 0) as number,
  };
}

// プレイリスト作成（堅牢版）:
// 1) /v1/me で user_id を取得
// 2) users/{id}/playlists に POST（public: false で試行）
// 3) 失敗時フォールバック：
//    - public: true で再試行（private権限が無い場合）
//    - 最小ボディ { name } で再試行
//    - さらに /v1/me/playlists にも試行（古い互換ルート）
async function spCreatePlaylist(token: string, name: string, description: string) {
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) {
    const t = await meRes.text().catch(() => "(no body)");
    throw new Error(`Spotify auth failed: ${t}`);
  }
  const me = await meRes.json();
  const userId = me?.id;
  if (!userId) throw new Error("Spotify user id not found");

  const tryCreate = async (url: string, body: any) => {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await r.text().catch(() => "(no body)");
    return { ok: r.ok, status: r.status, text, json: safeJson(text) };
  };

  const baseUrl = `https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`;
  // 試行1: private
  let res = await tryCreate(baseUrl, {
    name: name || "TRIW Mixtape",
    description: description || "",
    public: false,
  });
  if (!res.ok) {
    // 試行2: public
    res = await tryCreate(baseUrl, { name: name || "TRIW Mixtape", public: true });
  }
  if (!res.ok) {
    // 試行3: 最小ボディ
    res = await tryCreate(baseUrl, { name: name || "TRIW Mixtape" });
  }
  if (!res.ok) {
    // 試行4: /v1/me/playlists 互換ルート
    res = await tryCreate("https://api.spotify.com/v1/me/playlists", { name: name || "TRIW Mixtape" });
  }

  if (!res.ok) {
    throw new Error(`Create playlist failed: ${res.text}`);
  }

  const j = res.json as any;
  return {
    id: j.id as string,
    url: (j?.external_urls?.spotify as string) || (j?.uri as string) || null,
  };
}

async function spAddTracks(token: string, playlistId: string, uris: string[]) {
  const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "(no body)");
    throw new Error(`Add tracks failed: ${t}`);
  }
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

/** ---------------- Route Handler ---------------- **/

export async function POST(req: Request) {
  try {
    const {
      title,
      description,
      djId,
      targetCount,
      candidates,
      runId,
    }: {
      title: string;
      description: string;
      djId: string;
      targetCount?: number;
      candidates: Candidate[];
      runId?: string;
    } = await req.json();

    // cookies() は await が必要（Next.jsの仕様）
    const jar = await cookies();
    const token = jar.get("spotify_access_token")?.value ?? null;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Spotify access token missing. Please login." },
        { status: 401 }
      );
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: "candidates are required" },
        { status: 400 }
      );
    }

    const limit = clamp(Number(targetCount ?? 7), 1, 50);

    // 1) 候補→Spotify解決（D ログ用）＋ 失敗理由を収集
    const errors: string[] = [];
    const resolved: ResolvedTrack[] = await Promise.all(
      candidates.map(async (c) => {
        try {
          const hit = await spSearchTrack(token, c.title, c.artist);
          return {
            title: c.title,
            artist: c.artist,
            album: c.album ?? null,
            arc: (c.arc ?? "other") as Arc,
            year_guess: c.year_guess ?? null,
            spotify: hit,
          };
        } catch (e: any) {
          const msg = String(e?.message || e || "unknown_error");
          errors.push(`[${c.title} – ${c.artist}] ${msg}`);
          return {
            title: c.title,
            artist: c.artist,
            album: c.album ?? null,
            arc: (c.arc ?? "other") as Arc,
            year_guess: c.year_guess ?? null,
            spotify: null,
          };
        }
      })
    );

    // 2) D ログ保存（runId があれば）
    if (runId) {
      try {
        await saveRaw(runId, "D", { resolved, targetCount: limit, title, djId, debug: errors.slice(0, 10) });
      } catch (e) {
        console.error("saveRaw(D) failed", e);
      }
    }

    // 3) 成功解決のみで選抜 → URI 抽出
    const picked = pickByArc(
      resolved.filter((r) => r.spotify && r.spotify.uri),
      limit
    );
    const uris = picked.map((p) => p.spotify!.uri);

    if (uris.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No tracks resolved on Spotify.",
          resolvedCount: resolved.filter((r) => r.spotify).length,
          debug: errors.slice(0, 5),
        },
        { status: 400 }
      );
    }

    // 4) プレイリスト作成 → 曲追加
    const pl = await spCreatePlaylist(token, title, description || `DJ: ${djId || "-"}`);
    await spAddTracks(token, pl.id, uris);

    // 5) E ログ保存（runId があれば）
    if (runId) {
      try {
        await saveRaw(runId, "E", {
          playlistUrl: pl.url,
          picked: picked.map((p) => ({
            title: p.title,
            artist: p.artist,
            uri: p.spotify?.uri ?? null,
          })),
        });
      } catch (e) {
        console.error("saveRaw(E) failed", e);
      }
    }

    return NextResponse.json({ ok: true, playlistUrl: pl.url });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
