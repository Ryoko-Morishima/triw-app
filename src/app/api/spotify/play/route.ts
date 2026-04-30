import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { uri } = await req.json();
const cookieNames = req.cookies.getAll().map((c) => c.name);
console.log("cookies in /api/spotify/play:", cookieNames);
    const accessToken = req.cookies.get("spotify_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token" },
        { status: 401 }
      );
    }

    const res = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [uri],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Spotify API error", detail: text },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}