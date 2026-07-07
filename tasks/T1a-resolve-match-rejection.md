# T1a: 誤解決の除外 — マッチ情報を評価に接続する

- ステータス: todo
- 検証区分: A
- 依存: T0
- 対応課題: PROJECT.md §4-3（アーティスト解決ミス）

## 目的
「曲名は合っているがアーティストが違う」誤解決曲が採用リストに入らないようにする。

## 背景
- `resolveCandidatesD` は title_exact / title_contains / artist_exact を debug に保持しているが、`evaluateTuneTracks` はそれを一切参照していない
- `searchTrackBestEffort` のフォールバックは最終的にタイトルのみ検索まで落ちるため、誤解決は構造的に発生する
- レガシー `src/lib/evaluate.ts` に表記マッチ（fuzzy含む）の実装例がある。**参照・移植は推奨、レガシー側は変更しない**（AGENTS.md §3）

## スコープ
- E（evaluateTuneTracks）で match 情報を使った判定を追加。アーティスト不一致は原則 rejected（表記ゆれ・feat.・別名義の許容ロジックは裁量。evaluate.ts の正規化が参考になる）
- 検索フォールバック段の見直し（タイトルのみ検索の扱い）は**やってよいが慎重に**: notFoundCount の悪化とトレードオフになるため、変更する場合は notFoundCount も含めて before/after を報告

## 非スコープ
- ジャンル・質感の検証（T1c）
- 検索クエリの全面再設計

## 対象ファイル（起点）
- `src/lib/triw/program/evaluateTuneTracks.ts`
- `src/lib/triw/spotify/resolveCandidates.ts`（match情報の受け渡し確認）
- 参照のみ: `src/lib/evaluate.ts`、`src/lib/spotify.ts`

## 完了条件
1. before/after 各3回以上の実験で `evaluation.resolveErrors` が減少（目標: 採用リスト内0件）
2. notFoundCount が大きく悪化していない（悪化した場合は数値と判断を報告）
3. 構造化ログに changeRef つきで記録済み
4. PROJECT.md §4 の課題表を更新

## 人間に依頼すること
- after 実験の採用リストの耳確認（誤解決の見落としがないか）

## 作業記録
（着手時に追記）
