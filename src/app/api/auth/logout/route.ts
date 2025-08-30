import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(){
  const res = NextResponse.json({ ok:true });
  for(const n of ["spotify_access_token","spotify_refresh_token","spotify_access_token_expires","pkce_verifier","oauth_state"]){
    res.cookies.set(n,"",{path:"/",maxAge:0});
  }
  return res;
}
