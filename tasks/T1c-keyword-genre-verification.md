# T1c: キーワード質感の検証 — ジャンルタグの導入

- ステータス: todo
- 検証区分: A
- 依存: T0
- 対応課題: PROJECT.md §4-4（キーワードの質感が保証されない）

## 目的
「オルタナ」等のキーワードに明らかに適合しない曲（例: Fleetwood Mac）が採用されるのを減らす。生成任せだった質感を、評価側で答え合わせできるようにする。

## 背景
- 現状、候補がキーワードに適合するかを検証する工程がない
- Spotify の artist_genres は未取得。audio features（tempo/energy）は取得済みだが E で未使用
- キーワードカード27種すべてに厳密なジャンル対応を作るのは過剰。まず culture 系カード（オルタナ、ポップ等）から

## スコープ
- D で artist_genres を取得（アーティスト単位のAPI呼び出しが増えるため、重複排除とレート配慮を必須とする。AGENTS.md §2-6）
- キーワードカード定義に、適合/不適合のジャンルタグ（許容リスト・除外リスト等、形式は裁量）を追加。**初期対象は実験で使用実績のある culture 系カードのみでよい**
- E でジャンル適合の判定を追加。ハード除外にするか減点にするかは裁量（ジャンルタグは不完全な信号なので、初期は減点＋ログ記録で様子を見る案を推奨）
- audio features の活用（temperature軸との突き合わせ等）は**任意の追加検討**。やる場合はスコープを別途この欄に追記

## 非スコープ
- 全27カードへのタグ整備（効果確認後に拡張）
- musicAffectMap とスライダーの接続（T3）

## 対象ファイル（起点）
- `src/lib/triw/spotify/resolveCandidates.ts`、`src/lib/spotify.ts`（genres取得）
- `src/lib/triw/input/cards/keywordCards.ts`（タグ追加）
- `src/lib/triw/program/evaluateTuneTracks.ts`

## 完了条件
1. before/after 各3回以上（キーワード: alternative 推奨。実験実績があり比較しやすい）で、人間評価によるキーワード不適合曲が減少
2. Spotify への追加リクエストが 429 を誘発していない
3. 構造化ログに記録済み、PROJECT.md 課題表を更新

## 人間に依頼すること
- **このタスクは人間の耳評価が完了判定に必須**（keywordFit は機械算出できないため）。after 実験の各リストへの ok/partial/ng 評価

## 作業記録
（着手時に追記）
