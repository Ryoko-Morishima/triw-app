import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(){
  const jar = await cookies();
  const access = jar.get("spotify_access_token")?.value || null;
  const expStr = jar.get("spotify_access_token_expires")?.value || null;
  const ok = !!access && (expStr ? Number(expStr)-30000 > Date.now() : false);
  return NextResponse.json({ loggedIn: ok, expiresAt: expStr ? Number(expStr) : null });
}
