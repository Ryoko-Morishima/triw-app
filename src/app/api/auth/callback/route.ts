import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
type TokenResponse = { access_token:string; token_type:"Bearer"; scope:string; expires_in:number; refresh_token?:string; };
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const s = jar.get("oauth_state")?.value ?? null;
  const v = jar.get("pkce_verifier")?.value ?? null;
  if(!code || !state || !s || !v || state!==s) return NextResponse.redirect("/?auth=error");
  const body = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
    code_verifier: v,
  });
  const r = await fetch("https://accounts.spotify.com/api/token", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body });
  if(!r.ok) return NextResponse.redirect("/?auth=token_failed");
  const json = (await r.json()) as TokenResponse;
  const expiresAt = Date.now() + json.expires_in*1000;
  const res = NextResponse.redirect("/",302);
  res.cookies.set("spotify_access_token", json.access_token, { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:json.expires_in });
  if(json.refresh_token){
    res.cookies.set("spotify_refresh_token", json.refresh_token, { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:60*60*24*30 });
  }
  res.cookies.set("spotify_access_token_expires", String(expiresAt), { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:json.expires_in });
  res.cookies.set("pkce_verifier","",{path:"/",maxAge:0});
  res.cookies.set("oauth_state","",{path:"/",maxAge:0});
  return res;
}
