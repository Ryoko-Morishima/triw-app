# TRIW 開発日誌 2025-09-23

## 概要
- **目的**: 「Plastic Love」など有名なのに Spotify の popularity 数字が低い曲が落ちる問題を解消。
- **対応**: popularity 系の評価を完全に廃止し、存在確認・表記一致・年代整合のみで判定するように変更。
- **成果**: Plastic Love が confidence=0.65 で `accepted:true` になり、代表曲を正しく拾えるようになった。

## 変更内容
- `src/lib/evaluate.ts`
  - popularity_hint / popularity_score を評価から削除（debug項目としてのみ残存）
  - スコア計算式をシンプル化：
    - 存在確認（exists: +0.40）
    - 表記一致（exact:+0.25 / fuzzy:+0.15）
    - 年代一致（year_gate=ON かつ ±3年以内:+0.25）
  - 合格閾値: 0.50
- Plastic Love テスト結果：
  - `exists=0.40 + exact=0.25 = 0.65` → accepted
  - reason: "Spotifyで実在確認済み / 表記一致（exact） / 年代ゲートOFF"

## 保存対応
- **ブランチ作成**: `feat/evaluate-refactor`
- **コミット**: "feat(evaluate): popularity判定を廃止し、存在+表記一致+年代のみで評価 (Plastic Love通過確認)"
- **タグ作成**: `evaluate-ok-20250923`

## 次の課題
1. 年代ゲートONの挙動テスト（±3年救済 / 大ズレの確認）
2. Fフェーズ実装（picked曲から番組リストへ整形）
3. ログ理由の表記改善（ユーザーにとってよりわかりやすく）

---

👉 これで「人気度に左右されず、存在と正しさで曲を拾う」基盤ができた。
