export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireSpotifyToken, listMyPlaylists } from "@/lib/spotify";

export async function GET() {
  try {
    const token = await requireSpotifyToken();
    const playlists = await listMyPlaylists(token);
    return NextResponse.json({ ok: true, playlists });
  } catch (e: any) {
    const status = e?.status;
    if (status === 403 || status === 401) {
      return NextResponse.json(
        {
          ok: false,
          code: "INSUFFICIENT_SCOPE",
          error:
            "プレイリスト一覧を取得できませんでした。認証スコープが不足している可能性があります。一度ログアウトして再度Spotifyにログインしてください。",
        },
        { status }
      );
    }
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
