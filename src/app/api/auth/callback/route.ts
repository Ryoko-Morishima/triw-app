import { cookies } from "next/headers";
export const runtime = "nodejs";

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("oauth_state")?.value ?? null;
  const verifier = jar.get("pkce_verifier")?.value ?? null;

  if (!code || !state || !savedState || !verifier || state !== savedState) {
    return html(400, `Auth error (state/verifier mismatch). <a href="/">Home</a>`);
  }

  const body = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!, // /api/auth/callback で統一
    code_verifier: verifier,
  });

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "(no text)");
    return html(400, `Token exchange failed.<pre>${escapeHtml(text)}</pre><a href="/login">Retry</a>`);
  }

  const json = (await resp.json()) as TokenResponse;
  const expiresAt = Date.now() + json.expires_in * 1000;

  const isProd = process.env.NODE_ENV === "production";
  const home = process.env.NEXT_PUBLIC_BASE_URL ?? "/";

  // 200 + meta refresh で確実に Set-Cookie を反映させる
  const res = new Response(
    `<html><head><meta http-equiv="refresh" content="0; url=${home}" /></head><body>Redirecting…</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

  // アプリ用Cookie（HttpOnly）
  res.headers.append("Set-Cookie", setCookie("spotify_access_token", json.access_token, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: json.expires_in,
  }));
  if (json.refresh_token) {
    res.headers.append("Set-Cookie", setCookie("spotify_refresh_token", json.refresh_token, {
      httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    }));
  }
  res.headers.append("Set-Cookie", setCookie("spotify_access_token_expires", String(expiresAt), {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: json.expires_in,
  }));

  // 一時Cookie掃除
  res.headers.append("Set-Cookie", setCookie("pkce_verifier", "", { path: "/", maxAge: 0 }));
  res.headers.append("Set-Cookie", setCookie("oauth_state", "", { path: "/", maxAge: 0 }));

  return res;
}

function setCookie(name: string, value: string, opt: {
  httpOnly?: boolean; secure?: boolean; sameSite?: "lax"|"strict"|"none";
  path?: string; maxAge?: number;
}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opt.maxAge != null) parts.push(`Max-Age=${opt.maxAge}`);
  if (opt.path) parts.push(`Path=${opt.path}`);
  if (opt.httpOnly) parts.push(`HttpOnly`);
  if (opt.secure) parts.push(`Secure`);
  if (opt.sameSite) parts.push(`SameSite=${opt.sameSite[0].toUpperCase()}${opt.sameSite.slice(1)}`);
  return parts.join("; ");
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
function html(status: number, body: string) {
  return new Response(`<html><body style="font-family:sans-serif;padding:16px">${body}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
