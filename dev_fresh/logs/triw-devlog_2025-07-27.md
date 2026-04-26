# 📓 開発日誌：2025-07-27（日）

## 🎯 今日の目標・やったこと
- Postman での Spotify API テストをいったん終了
- 今後は Web アプリ上で Spotify API を直接利用する方針に切り替え
- そのために、Next.js + TypeScript による Spotify 認証（Authorization Code Flow）サンプルプロジェクトを作成
- `pages/index.tsx` で Spotify ログインリンクを表示
- `pages/api/callback.ts` で `code` を受け取り `access_token` を取得
- 今後このサンプルを元に Spotify Web API を組み込んでいく方針を確認

## 💬 気づき・感想
- Postman の操作に慣れてきたが、Webアプリに組み込むための次のステップに進む時期だと判断
- Get Token ボタンが使えない Spotify API Console に頼らない実装を進めることで、より自立した開発ができそう

## ⏭ 次回やること
- VS Code で `spotify-auth-sample` を立ち上げてサンプルを動かす
- 環境変数 `.env.local` を正しく設定
- 認証フローをブラウザで確認
- トークン取得後に簡単なAPI（/v1/me など）を呼び出してみる

