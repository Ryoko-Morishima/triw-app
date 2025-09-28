// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

function base64urlFromBytes(bytes: Uint8Array) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlFromString(s: string) {
  return base64urlFromBytes(new TextEncoder().encode(s));
}
async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}
function rand(len = 64) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(b).map(v => v.toString(16).padStart(2, "0")).join("");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";

  // ★ 追加: ログイン後の戻り先（デフォルトは /playlist）
  const next = url.searchParams.get("next") || "/playlist";

  const client_id = (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "").trim();
  const redirect_uri = (process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "").trim();
  const scope =
    process.env.SPOTIFY_SCOPES ??
    "playlist-modify-private playlist-modify-public user-read-email";

  // PKCE
  const verifier = rand(64);
  const challenge = base64urlFromBytes(await sha256(verifier));

  // CSRF用の乱数
  const nonce = rand(24);

  // ★ 変更: state は { next, nonce } を JSON→Base64URL 化して詰める
  const statePayload = { next, nonce };
  const state = base64urlFromString(JSON.stringify(statePayload));

  const params = new URLSearchParams({
    client_id,
    response_type: "code",
    redirect_uri,
    scope,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state, // ← JSONを入れたstate
  });

  const authorizeUrl = "https://accounts.spotify.com/authorize?" + params.toString();

  if (debug) {
    return NextResponse.json({
      authorizeUrl,
      redirect_uri,
      client_id_present: !!client_id,
      statePayload, // ここだけデバッグで中身を返す
      note: "Redirect URI はダッシュボードに登録されたものと完全一致している必要があります",
    });
  }

  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(authorizeUrl, 302);

  // 使い捨てクッキー
  res.cookies.set("pkce_verifier", verifier, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 600,
  });
  // ★ 変更: コールバックでnonce照合できるように oauth_state も残す（任意）
  res.cookies.set("oauth_state", state, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 600,
  });
  // ★ 追加: nonce 単体も持っておくと照合が簡単
  res.cookies.set("oauth_nonce", nonce, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 600,
  });

  return res;
}
