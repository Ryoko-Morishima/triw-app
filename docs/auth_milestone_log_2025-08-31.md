# TRIWi Auth Milestone Log (2025-08-31)

Spotify 認証（PKCE）を **安定稼働**させるまでに遭遇した問題と解決策の要約です。

---

## 1. 主な問題と対処

- **package.json が壊れて起動不可**
  - 症状: `Unexpected token '﻿' ... is not valid JSON`
  - 原因: 先頭BOM/不可視文字
  - 対処: `del package.json` → `npm init -y` で再生成

- **ポート競合**
  - 症状: `EADDRINUSE: address already in use :::3000`
  - 対処: プロセスkill or `npm run dev -- -p 3001`

- **Next.js 15 の相対リダイレクト禁止**
  - 症状: `URL is malformed "/"` / `"/?auth=error"`
  - 対処: `NextResponse.redirect(new URL("/", req.url))` など **絶対URL** に変更

- **開発環境で Cookie が付与されない**
  - 原因: `secure: true` は HTTPSのみ
  - 対処: `secure: isProd`（開発は false、本番は true）で切替

- **localhost と 127.0.0.1 の混在**
  - 症状: APIはtrueでもUIは未ログイン
  - 対処: **アクセス/環境変数/Spotify設定を 127.0.0.1 に統一**

- **redirect と Set-Cookie の相性問題**
  - 症状: `NextResponse.redirect` で `Set-Cookie` がヘッダーに載らない
  - 対処: **200 + HTML meta refresh** を使って確実にCookieを付与

- **Spotifyの INVALID_CLIENT (Invalid redirect URI)**
  - 原因: Dashboard登録値と送信 `redirect_uri` の完全一致が崩れる
  - 対処: Dashboard を `http://127.0.0.1:3000/api/auth/callback` の1本に統一、
    `.env.local` も同値。`/api/auth/login?debug=1` で実際の URI を可視化。

- **StrictMode による useEffect 二重実行→過剰リトライ**
  - 対処: `useRef` で二重起動ガード＋リトライ上限＋クリーンアップ

- **next.config.js の編集ミス**
  - 症状: `ReferenceError: a is not defined`
  - 対処: 余計な文字を除去して正しいJSに

- **allowedDevOrigins の警告**
  - 症状: `Unrecognized key 'allowedDevOrigins'`
  - 対処: 現状は警告のみ。気になる場合は設定を削除。

- **環境変数の混在**
  - 対処: 旧キー（`SPOTIFY_CLIENT_ID/SECRET/REDIRECT_URI`）を削除し、下記に統一：
    ```env
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
    NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000/
    NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
    SPOTIFY_SCOPES=playlist-modify-private playlist-modify-public user-read-email
    ```

---

## 2. 現在の安定フロー

1. `/login` → `/api/auth/login` が PKCE で Spotify 認可へ
2. 認可後 `/api/auth/callback` が **200 + meta refresh** で Cookie を確実に付与して Home へ戻す
3. Cookie: `spotify_access_token`, `spotify_refresh_token`(任意), `spotify_access_token_expires`
4. `/api/auth/status` で `{"loggedIn": true, ...}` を返せる

---

## 3. 再検証のショート手順

1. Cookieを削除（127.0.0.1 の `spotify_*`, `pkce_*`）
2. `npm run dev` 再起動 → `http://127.0.0.1:3000/login`
3. 認可 → 一瞬 “Redirecting…” → Home
4. `/api/auth/status` が `true`、DevToolsで `spotify_access_token` を確認

---

## 4. チェックリスト

- [ ] Dashboard と `.env.local` の `redirect_uri` が **完全一致**
- [ ] 開発は `secure:false`（`isProd` 判定で切替）
- [ ] すべて **127.0.0.1:3000** に統一
- [ ] `NextResponse.redirect` ではなく **200+meta refresh** でCookie付与
- [ ] `.env.local` に旧キーが残っていない

---

## 5. マイルストーン
- Spotify 認証（PKCE）：**安定稼働**
- 以降、Spotify Web API（/v1/me, プレイリスト作成 等）へ安全に進める状態
