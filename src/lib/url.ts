// src/lib/url.ts
import { headers } from "next/headers";

/**
 * 現在のホストから絶対URLを作るユーティリティ。
 * 優先順:
 * 1) 受信ヘッダ (x-forwarded-proto / x-forwarded-host or host)  ← Vercel/Proxyで正
 * 2) 環境変数 (NEXT_PUBLIC_BASE_URL / BASE_URL / VERCEL_URL など)
 * 3) 最終フォールバック: http://127.0.0.1:{PORT}
 */
export function getBaseUrl(): string {
  const h = headers();

  const xfProto = h.get("x-forwarded-proto");
  const xfHost  = h.get("x-forwarded-host");
  const host    = h.get("host");

  // 1) プロキシ越し or 本番CDNのヘッダがあれば最優先
  if (xfProto && (xfHost || host)) {
    return `${xfProto}://${xfHost || host}`;
  }

  // 2) 環境変数から拾う（末尾スラは削除）
  const envUrl =
    (process.env.NEXT_PUBLIC_BASE_URL ||
     process.env.BASE_URL ||
     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
     process.env.RENDER_EXTERNAL_URL ||
     (process.env.FLY_APP_NAME ? `https://${process.env.FLY_APP_NAME}.fly.dev` : "") ||
     ""
    ).replace(/\/$/, "");
  if (envUrl) return envUrl;

  // 3) ローカル開発の最終フォールバック
  const port = process.env.PORT || "3000";
  const localHost = process.env.HOST || "127.0.0.1";
  return `http://${localHost}:${port}`;
}
