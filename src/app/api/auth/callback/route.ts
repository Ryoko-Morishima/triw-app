import { cookies } from "next/headers";
export const runtime = "nodejs";

type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

// Base64URL → JSON へ復元
function parseState(b64url: string | null): { next?: string; nonce?: string } | null {
  if (!b64url) return null;
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// next の安全化（/ から始まるパスのみ許可）
function sanitizeNext(next: string | undefined, fallback = "/playlist") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  // 二重スラッシュなどの外部遷移を抑止（//evil など）
  if (next.startsWith("//")) return fallback;
  return next;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const jar = await cookies();
  const savedState = jar.get("oauth_state")?.value ?? null;
  const savedNonce = jar.get("oauth_nonce")?.value ?? null;
  const verifier = jar.get("pkce_verifier")?.value ?? null;

  // まずは従来通りの state 一致チェック
  if (!code || !stateParam || !savedState || !verifier || stateParam !== savedState) {
    return html(400, `Auth error (state/verifier mismatch). <a href="/">Home</a>`);
  }

  // state の中身を復元（{ next, nonce } を想定）
  const parsed = parseState(stateParam);
  const nextPath = sanitizeNext(parsed?.next, "/playlist");

  // 可能なら nonce も照合（任意強化）
  if (parsed?.nonce && savedNonce && parsed.nonce !== savedNonce) {
    return html(400, `Auth error (nonce mismatch). <a href="/">Home</a>`);
  }

  const body = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!, // /api/auth/callback
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

  // メタリフレッシュで確実に Set-Cookie を効かせつつ、/playlist 等に戻す
  const res = new Response(
    `<html><head><meta http-equiv="refresh" content="0; url=${nextPath}" /></head><body>Redirecting…</body></html>`,
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
  res.headers.append("Set-Cookie", setCookie("oauth_nonce", "", { path: "/", maxAge: 0 })); // ← 追加

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
