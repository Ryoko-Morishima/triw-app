// Generic playlist writer: either creates a new private playlist or appends
// tracks to an existing one the user can already reach. Track URIs are
// always caller-supplied — nothing about song content is hardcoded here.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyToken, createPlaylist, addTracks } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: "new" | "existing" = body?.mode === "existing" ? "existing" : "new";
    const uris: string[] = Array.isArray(body?.uris) ? body.uris.filter(Boolean) : [];

    if (uris.length === 0) {
      return NextResponse.json({ ok: false, error: "追加する曲がありません" }, { status: 400 });
    }

    const token = await requireSpotifyToken();

    if (mode === "new") {
      const name = String(body?.name || "").trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: "プレイリスト名は必須です" }, { status: 400 });
      }
      const description = String(body?.description || "").trim();
      const pl = await createPlaylist(token, name, description, false);
      await addTracks(token, pl.id, uris);
      return NextResponse.json({
        ok: true,
        playlist: { id: pl.id, name: pl.name, url: pl?.external_urls?.spotify ?? null },
        addedCount: uris.length,
      });
    }

    // mode === "existing"
    const playlistId = String(body?.playlistId || "").trim();
    if (!playlistId) {
      return NextResponse.json({ ok: false, error: "追加先のプレイリストが指定されていません" }, { status: 400 });
    }

    try {
      await addTracks(token, playlistId, uris);
    } catch (e: any) {
      const status = e?.status;
      if (status === 403) {
        return NextResponse.json(
          {
            ok: false,
            code: "FORBIDDEN",
            error:
              "このプレイリストへの追加権限がありません。自分が作成したプレイリストでないか、共同編集がオンになっていない可能性があります。Spotify側で共同編集を有効にするか、別のプレイリストを選んでください。",
          },
          { status: 403 }
        );
      }
      throw e;
    }

    const plJson = await getPlaylistMeta(token, playlistId);
    return NextResponse.json({
      ok: true,
      playlist: { id: playlistId, name: plJson?.name ?? null, url: plJson?.external_urls?.spotify ?? null },
      addedCount: uris.length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

async function getPlaylistMeta(token: string, playlistId: string) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=name,external_urls`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
