import { NextResponse } from "next/server";
export const runtime = "nodejs";
function base64url(buf: ArrayBuffer) {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}
function rand(len=64){const b=crypto.getRandomValues(new Uint8Array(len));return Array.from(b).map(v=>v.toString(16).padStart(2,"0")).join("");}
export async function GET() {
  const client_id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;
  const redirect_uri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!;
  const scope = process.env.SPOTIFY_SCOPES ?? "playlist-modify-private playlist-modify-public user-read-email";
  const verifier = rand(64);
  const challenge = base64url((await sha256(verifier)).buffer);
  const state = rand(24);
  const p = new URLSearchParams({
    client_id, response_type:"code", redirect_uri, scope,
    code_challenge_method:"S256", code_challenge:challenge, state,
  });
  const res = NextResponse.redirect("https://accounts.spotify.com/authorize?"+p.toString(),302);
  res.cookies.set("pkce_verifier", verifier, {httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:600});
  res.cookies.set("oauth_state", state, {httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:600});
  return res;
}
