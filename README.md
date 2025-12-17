# TRIW 開発進捗メモ（2025-09-15）(2025-12-17 追記）

## 現状
- `/mixtape` ページで候補リストを生成できる
- 「この候補からプレイリスト作成」で **Spotifyにプレイリストを作成**できるようになった
- Spotify 認証（PKCE + Cookie保存）は安定動作中
- RunLog は **A～C** をUI表示、**D/E** は保存済みだがまだUIに出していない
- プリセットDJは11人（独自3人＋既定8人）を利用可能
- セーブポイントタグ: `savepoint-2025-09-15`

## 最近の進捗
- Playlist APIを堅牢化（public/private両対応、フォールバック付き）
- 「詳細ログを見る」リンクをプレイリスト作成後も常時表示
- 別タブでRunLogを開けるように改善

## 次のステップ
1. RunLogに **D: Spotify照合結果**、**E: Playlist URLと採用曲リスト** を表示する
2. 候補曲リストに「最終採用✓」マークを付与
3. テーマ解釈（B）の強化（単なる概要の言い換えではなく、DJの個性を反映した選曲ポリシーに落とす）
4. プレイリスト作成時のチェック強化 
5. ユーザー独自のDJ入力機能の追加

👉 詳細は `docs/design_notes_2025-09-01.md` および RunLog を参照

## 直近の最優先（RunLog を Vercel 上で保存・参照できるようにする）

### 目的
選曲精度改善のため、RunLog に A〜G の経緯をすべて残し、Vercel 上でも参照できるようにする
ローカル保存ではなく、公開環境（Vercel）で URL から RunLog を確認できる状態にする

### 実装方針（案）

- RunLog（JSON）を Vercel のサーバ側で永続化する（候補：Vercel Blob）
- 参照ページを追加し、/runlog/[runId] のようなURLでRunLogを閲覧できるようにする（初期はpreでJSON表示でOK）
- /mixtape から「RunLogを見る」リンクを常時表示できるようにする（runId をURLに含める）
- タスク分解（次にPCでやる）
1. 保存先の決定（Vercel Blob を第一候補）と環境変数の設定
2. 保存用 API を追加（例：POST /api/runlog）して runId と RunLog JSON を保存
3. 参照ページを追加（例：/runlog/[runId]）して JSON を取得・表示
4. /mixtape のUIに RunLog 参照リンクを追加（候補生成後/作成後に runId を保持してリンク表示）
まずは「見える化」優先。整形や一覧表示、検索は後回し

- 完了条件
1. Vercel 本番/Preview 上で、runId から RunLog を開いて確認できる
2. RunLog に A〜G（経緯）が入っており、コピペできる

## 開発フロー
- 作業ブランチ: `feat/phase2-spotify`
- 安定状態では savepoint タグを打つ（例: `savepoint-YYYY-MM-DD`）

## セットアップ
```bash
npm ci
npm run dev
