# T2: キュー多様性 — アーティスト上限＋軽い実行間対策

- ステータス: todo
- 検証区分: A
- 依存: T0（T1群の完了推奨。Eが強化されているほど効果測定がクリーン）
- 対応課題: PROJECT.md §4-1（同一アーティスト・同一曲の頻出）

## 目的
1回の採用リスト内のアーティスト重複をなくし、あわせて低コストな実行間多様性対策の効果を測る。

## 背景
- buildVisibleQueue は純粋スコア降順の上位N切り出しで、重複制限がない
- プロンプト文言による抑制は持続しないことを実験18–20で確認済み
- レガシー `src/lib/finalize.ts` の artistPolicy に実装例あり（参照・移植推奨、レガシーは変更しない）
- 本格的な候補プール＋サンプリングは T4。ここでは軽量策のみ

## スコープ
1. **実行内**: buildVisibleQueue に同一アーティスト上限（初期案: 1曲。閾値は裁量だが合格基準ドラフトに合わせる）
2. **実行間（軽量策・検討項目）**: 以下のいずれかを小さく実装して効果を測る
   - 直近の同一 conditionKey run の採用曲を、Cのプロンプトに簡易除外リストとして渡す
   - キュー構築時に直近runと重複する曲の優先度を下げる
   - どちらを選ぶか・両方やるかは裁量。**低コストで測定可能な範囲にとどめる**（ROADMAP.md Phase 2の縛り）

## 非スコープ
- 候補プールの永続化・プールからのサンプリング設計（T4）
- スコアリング自体の再設計

## 対象ファイル（起点）
- `src/lib/triw/program/buildVisibleQueue.ts`
- `src/lib/triw/selection/buildSelectionPrompt.ts`（除外リストを渡す場合）
- `src/app/api/program/tune/route.ts`（直近run参照の配線）
- 参照のみ: `src/lib/finalize.ts`

## 完了条件
1. before/after 各3回以上で `evaluation.diversityIntra.maxSameArtist` が上限以下
2. 同一条件run間の採用曲重複率（conditionKey ベースで算出）が低下傾向にあることを数値で報告
3. 除外リスト等の副作用（notFoundCount 増、キーワード適合の劣化）がないことを報告
4. 構造化ログに記録済み、PROJECT.md 課題表を更新

## 人間に依頼すること
- after 実験リストの主観評価（多様になったが質感が落ちていないか）

## 作業記録
（着手時に追記）
