import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const jar = await cookies();
  const access = jar.get("spotify_access_token")?.value || null;
  const expStr = jar.get("spotify_access_token_expires")?.value || null;

  const now = Date.now();
  const notExpired = expStr ? Number(expStr) - 30_000 > now : false;

  return NextResponse.json({
    loggedIn: !!access && notExpired,
    expiresAt: expStr ? Number(expStr) : null,
  });
}
