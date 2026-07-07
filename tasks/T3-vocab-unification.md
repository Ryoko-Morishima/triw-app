# T3: 生成と評価の語彙統一

- ステータス: todo
- 検証区分: A
- 依存: T1b（年代の評価側定義が固まってから）
- 対応課題: PROJECT.md §4-2, §4-5

## 目的
スライダー・キーワードの解釈（年レンジ、tempo/energy、質感記述）を単一の定義ファイルに集約し、Cのプロンプト生成とEの判定が同じ定義から導出される構造にする。

## 背景
- 現状、era スライダーの解釈が「生成側: 曖昧な自然文」「評価側: 具体年レンジ」と二重定義されている（PROJECT.md §3 の非対称）
- temperature 軸は musicAffectMap（tempo/energy翻訳）に未接続で、条件の掛け合わせで薄まる（課題5）

## スコープ
- スライダー各レベルの定義に、プロンプト用の具体記述（年代なら「主に1950〜1974年」等）と評価用の数値レンジを**同居**させる（sliderControls.ts の拡張が自然だが構成は裁量）
- buildSelectionPrompt / buildTuneInterpretation がその定義からプロンプト文を生成するよう変更
- evaluateTuneTracks の eraSliderToRange を同定義参照に置換（ロジック重複の解消）
- temperature 軸の tempo/energy への翻訳をプロンプトに注入（musicAffectMap の拡張 or スライダー定義への統合、いずれかは裁量）

## 非スコープ
- audio features を使った temperature の評価側検証（効果があれば別タスク起票）
- キーワードカード全体の再設計

## 対象ファイル（起点）
- `src/lib/triw/input/sliders/sliderControls.ts`
- `src/lib/triw/selection/buildSelectionPrompt.ts`、`buildTuneInterpretation.ts`
- `src/lib/triw/prompt/buildPromptPlan.ts`、`musicAffectMap.ts`
- `src/lib/triw/program/evaluateTuneTracks.ts`

## 完了条件
1. 年代・温度の解釈を変更する際、修正箇所が1ファイルで済む構造になっている
2. 回帰実験（代表条件で before/after 各3回以上）で eraFit / resolveErrors / diversity が悪化していない
3. 温度端指定（例: temperature=0 / 100）の結果に方向性の違いが出ることを報告（主観評価含む）
4. PROJECT.md §3 の非対称の記述を更新

## 人間に依頼すること
- 温度軸の耳評価（クール/ホットの体感差が出ているか）

## 作業記録
（着手時に追記）
