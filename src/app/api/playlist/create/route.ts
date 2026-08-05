import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyToken, createPlaylist, addTracks } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const uris: string[] = Array.isArray(body?.uris) ? body.uris.filter(Boolean) : [];
    const isPublic = Boolean(body?.public);

    if (!name || uris.length === 0) {
      return NextResponse.json({ error: "name と uris は必須です" }, { status: 400 });
    }

    const token = await requireSpotifyToken();
    const pl = await createPlaylist(token, name, description || "Created by TRIWinDev", isPublic);
    await addTracks(token, pl.id, uris);

    return NextResponse.json({
      playlistId: pl.id,
      playlistUrl: pl?.external_urls?.spotify ?? null,
      name: pl.name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
