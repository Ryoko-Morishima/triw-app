# T0: 実験ログの最小構造化＋保存の冪等性

- ステータス: todo
- 検証区分: B（選曲結果に影響しない）
- 依存: なし（**全区分Aタスクの前提**）
- 対応課題: PROJECT.md §4-6

## 目的
E/F改善（区分A）の before/after 検証を機械的に行えるよう、保存時に自動算出できる評価フィールドを実験ログに追加する。あわせて保存の二重発火を防ぐ。

## スコープ
- AGENTS.md §5 スキーマのうち自動算出フィールドの実装:
  - `evaluation.resolveErrors` — Dの match debug（title_exact/artist_exact 等）から誤解決を判定・カウント。判定基準の初期案: title系が一致かつ artist_exact が false のものを誤解決候補とする（詳細はエージェント裁量、判定基準をログに残すこと）
  - `evaluation.eraFit` — Eの eraSliderToRange 判定を再利用し、採用曲中のレンジ外件数を記録。レンジ無し時は na
  - `evaluation.diversityIntra.maxSameArtist` — visibleQueue 内の同一アーティスト最大数
  - `evaluation.notFoundCount` — D の notFound 件数
  - `evaluation.keywordFit` — null 固定で保存（入力手段は T5）
- `conditionKey` — 入力条件（keywords, era, temperature, popularity, mode, count/duration）の正規化ハッシュ
- `codeVersion` / `changeRef` — 環境変数または設定値からの記録で可
- 同一 runId の重複保存防止（保存APIの冪等化）

## 非スコープ
- diversityInter のリアルタイム算出（conditionKey があれば後算出可能。実装は任意、完了条件に含めない）
- 人間評価の入力UI、ログ一覧・集計画面（T5）
- 過去ログ（21件）のマイグレーション（T5で検討）

## 対象ファイル（起点）
- `src/app/api/experiments/save/route.ts`
- `src/lib/triw/logs/`（saveRunLog, logStorage）
- `src/app/api/program/tune/route.ts`（evaluation算出の呼び出し位置）
- 新設: `src/lib/triw/logs/computeEvaluation.ts` 等（命名は裁量）

## 完了条件
1. tune を1回実行すると、上記フィールドがすべて保存される
2. 同一 runId で保存を2回叩いても1件しか残らない
3. typecheck が通り、`npm run dev` で /program が正常動作する
4. AGENTS.md §5 のスキーマ記述と実装が一致している（差分があれば AGENTS.md を更新）

## 人間に依頼すること
- なし（区分Bのため）。完了報告のみ

## 作業記録
（着手時に追記）
