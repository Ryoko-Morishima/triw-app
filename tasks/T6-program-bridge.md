# T6: 番組化ブリッジ — テキスト曲紹介の挿入

- ステータス: todo（**着手条件未成立**）
- 検証区分: A
- 依存: 合格基準の正式承認＋達成＋**人間のフェーズ移行判断**（AGENTS.md §1）
- 対応: PROJECT.md §1 最終ゴールへの最初の一歩

## 目的
選曲リストを「番組」に変える最小ステップとして、曲間にテキストの曲紹介を挟む。TTS・音声再生はまだやらない。

## 背景
- ProgramEvent は実質 type:"track" のみ。talkEnabled は配線済みだが未作用
- 旧 mixtape の runMemoNoteG（openai.ts）が最も近い先行実装（参照・移植推奨）
- narration/ playback/ はREADMEのみのスタブ

## スコープ
- ProgramEvent に "narration" 型を追加し、buildEvents で曲間に挿入
- 曲紹介テキストの生成（1曲60〜120字程度、事実ベース＋軽い温度感。プロンプトは裁量）
- talkEnabled=false 時は挿入しない（既存フラグを生かす）
- /program の表示にナレーションイベントを組み込む

## 非スコープ
- TTS音声化、Spotify実再生との同期、時報・ニュース（すべて後続タスクとして起票）

## 対象ファイル（起点）
- `src/lib/triw/program/buildEvents.ts`、`types.ts`
- `src/lib/triw/narration/`（実装をここに置く）
- `src/app/program/page.tsx`
- 参照のみ: `src/lib/openai.ts` の runMemoNoteG

## 完了条件
1. talkEnabled=true で「曲紹介→曲→曲紹介→曲」の順にイベントが並ぶ
2. 紹介文に事実誤り（曲名・アーティスト・年代の取り違え）がないことを人間が確認
3. 選曲品質の指標が悪化していない（区分A検証）

## 人間に依頼すること
- フェーズ移行の判断（着手前）
- 紹介文のトーン確認（ラジオとして心地よいか）

## 作業記録
（着手時に追記）
