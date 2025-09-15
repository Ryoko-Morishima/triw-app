# TRIW 開発進捗メモ（2025-09-15）

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

## 開発フロー
- 作業ブランチ: `feat/phase2-spotify`
- 安定状態では savepoint タグを打つ（例: `savepoint-YYYY-MM-DD`）

## セットアップ
```bash
npm ci
npm run dev
