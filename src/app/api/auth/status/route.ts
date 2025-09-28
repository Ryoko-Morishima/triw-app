// src/app/api/auth/status/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const jar = cookies();
  const access = jar.get("spotify_access_token")?.value ?? null;
  const expStr = jar.get("spotify_access_token_expires")?.value ?? null;

  const now = Date.now();
  const expiresAt = expStr ? Number(expStr) : null;
  const notExpired = expiresAt ? expiresAt - 30_000 > now : false;

  const loggedIn = !!access && notExpired;

  // キャッシュさせない
  const res = NextResponse.json(
    {
      loggedIn,            // 既存互換
      authenticated: loggedIn, // フロントが期待するキー
      expiresAt,           // デバッグ・UI用
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    }
  );

  return res;
}
