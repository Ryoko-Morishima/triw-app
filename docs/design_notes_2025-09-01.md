/triw-app
├─ src/
│  ├─ app/
│  │  ├─ mixtape/        ← フロントUI（番組入力フォーム＋結果表示）
│  │  │   └─ page.tsx
│  │  ├─ api/
│  │  │   ├─ mixtape/
│  │  │   │   └─ plan/route.ts ← 番組計画API（AI→Spotify）
│  │  │   └─ auth/...          ← Spotify認証関連
│  ├─ lib/
│  │  ├─ openai.ts    ← A/B/C/E/F のプロンプト処理
│  │  ├─ spotify.ts   ← Spotify APIラッパー
│  │  └─ runlog.ts    ← ログ保存（思考過程）
│  └─ data/
│      └─ djs.ts      ← プリセットDJ情報（8人）
│
├─ docs/
│  ├─ project_idea.md              ← サービスの全体アイデア
│  ├─ playlist_flow_design_2025-08-31.md ← プレイリスト生成のフローデザイン
│  ├─ auth_milestone_log_2025-08-31.md   ← Spotify認証まわりの進捗ログ
│  ├─ devlog_2025-08-31.md               ← 開発日誌
│  └─ design_notes_2025-09-01.md (予定) ← 現状まとめ
│
├─ .env.local    ← Spotify / OpenAI / Google TTS APIキー
├─ tsconfig.json ← パスエイリアス設定（@/dataなど）

# TRIW 開発ノート（2025-09-01 時点）

## 現在の進捗
- ソースコードはまだエラー等あり完成していない
- ただし構成とフロー、プロンプト設計は固まってきた
- 紙上テストで DJごとに違う選曲結果が出ることを確認

---

## フロー（A〜F）

1. **A: DJペルソナ設定**
   - 背景・好むジャンル・避けるジャンル・流れの癖・キャラメモを定義
   - プリセットDJ（例: Techne, Haru, Rio, Sakura, Blaze, Mist, Blue Note, Nomad）

2. **B: 番組テーマ解釈（DJ本人）**
   - 番組名／概要を読んでDJが解釈
   - 出力: 方向性・Hard constraints・Soft preferences・Flow style
   - ＝「番組の軸」

3. **C: 候補曲リスト（DJ本人）**
   - 目標曲数×2件を出す
   - 各曲に: title, artist, album, arc, reason（中立＋キャラ味少し）, whyPersonaFit, whyThemeFit, year_guess
   - Spotifyはこの段階では未使用

4. **D: Spotify照合**
   - 候補曲をSpotify APIで検索
   - URI, release_year, artist_genres, album_image_url, audio_featuresを付与
   - 存在しなければ notFound に

5. **E: 妥当性チェック（DJ本人）**
   - Hard違反（年・地雷ジャンル・テーマ外）を必ず除外
   - Soft（ムード・流れ・好むジャンル）は裁量
   - 曲数指定 → その数ぴったり
   - 分数指定 → 合計時間を指定の ±10% に収める
   - 出力: accepted[]（理由つき）, rejected[]（理由つき）

6. **F: 番組紹介**
   - Bの中立解釈を基に、DJキャラを反映したナレーションを生成
   - UIにはキャラ味強めの紹介文を表示
   - ログには中立解釈を残す

---

## プロンプト設計（たたき台）

- **A: ペルソナ**
  - 「背景・好むジャンル・避けるジャンル・流れの癖・キャラメモ」を出力
- **B: 解釈**
  - 「方向性」「Hard constraints」「Soft preferences」「Flow style」
- **C: 候補曲**
  - JSON配列のみ、目標曲数×2
- **E: 妥当性チェック**
  - accepted/rejectedを理由つきで
  - 曲数 or 分数（±10%）調整
- **F: 番組紹介**
  - 中立解釈＋キャラ味を混ぜて60〜120字

---

## 紙上テスト結果
- テーマ「夜ドライブで聴きたい静かな始まりから盛り上がる」  
- Haru → インディポップ寄りで物語的構成  
- Rio → ソウル寄りでグルーヴ構成  
- Techne → テクノ寄りでミニマル構成  
- ＝DJごとに方向性の違うリストが出せることを確認

---

## 次のステップ（Phase 1）
- A→B→C のプロンプトをつないで **候補曲リストをAIから取得**する処理を試作
- まだSpotify照合や妥当性チェックは実装しない


⚠️ 注意
現時点ではコードはまだ完成しておらず、ソースは動作していない。
この文書は「構成・フロー・プロンプト設計」が固まった段階を記録したものであり、
今後実装・デバッグを進める際の基準となる。

🎯 やろうとしていること

サービスのゴール

番組名・概要・DJを選ぶ → AIが候補曲を出す

Spotifyで存在確認 → 妥当性チェックで最終リスト

プレイリスト作成＋番組紹介生成

UIでジャケ写＋理由つきで見れる

思考過程は runId で別ページに保存・確認できる

開発フェーズの流れ

Phase 1: A→B→C（候補曲まで出す）

Phase 2: Spotify照合（URI/album_image取得）

Phase 3: 妥当性チェック（Hard除外＋±10%調整）

Phase 4: 番組紹介生成（キャラ味強め）

Phase 5: UI/ログの整備

🐛 現在の課題

ソースがまだ動いていない

import エイリアス問題は修正済み（tsconfig設定）

ただし A→B→C のフローが未接続で、実際には候補曲が出ていない

プロンプト設計は固まったが実装前

DJ本人が解釈→候補曲→妥当性チェックする設計にまとまった

キャラ味の出し方：reasonに少し、番組紹介で強め

±10%ルールを導入（分数指定）

Spotify統合部分が課題

候補がSpotifyに存在しない場合が多い → notFoundに出す処理はあるが、改善余地あり

ジャケ写やアルバム名を拾う処理を組み込む必要がある

ログの扱い

runlog.ts はあるが、思考過程ページ（/mixtape/thinking）が白紙になることあり

フェーズCの raw テキストを保存してデバッグできるようにする必要

✅ 記録に残すポイント

現状のソースはまだ動かないが、フローとプロンプト設計は確定済み

8人のプリセットDJ（Techne/Haru/Rio/Sakura/Blaze/Mist/Blue Note/Nomad）が用意されている

紙上テストで検証済み：同じテーマでもDJごとに選曲が変わることを確認

課題は実装フェーズ1以降の接続とSpotify照合精度