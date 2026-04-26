# 📓 開発日誌：2025-07-26（土）

## 🎯 やったこと
- Spotify Web API の認証・推薦APIの動作を Postman で本格的に試行
- トップアーティスト取得API（`/v1/me/top/artists`）のレスポンス確認
- プレイリスト生成に向けて `/v1/recommendations` を試したが、パラメータエラーなどに苦戦
- seed_genres や target_valence などのパラメータ指定に失敗し、エラーを調査
- アクセストークン取得のトラブル（Web API Console で Get Token が表示されない）

## 🛠 課題と対応
- API Console が使えないことを確認し、今後は Postman 経由の認証を主軸にする方針に変更
- Postman の Authorization タブや Header 設定に慣れてきた
- 将来的には Postman を使わず、Webアプリ内で Spotify API を使えるようにしたいと思った

## 💬 感想・次へのステップ
- 目的のプレイリスト推薦APIが正しく動かず悔しかったが、Postman操作には自信がついてきた
- 次は Spotify 認証を Web アプリ側で処理できるようにサンプル構築へ移行予定

