# 選曲アルゴリズム強化メモ（TRIW）

## 1. 現状フロー（A〜G）

1. **A: ペルソナ生成（runPersonaA）**

   * DJの美学・禁則・流儀を自然文で定義
2. **B: テーマ解釈（runInterpretB）**

   * テーマをエッセイで再解釈＋制約抽出（eras/languages/regions 等）
3. **C: 候補出し（runCandidatesC）**

   * ペルソナ＋解釈Bに基づく選曲（意図ラベルつき）
4. **D: Spotify解決（resolveCandidatesD）**

   * 候補をSpotifyメタへ解決
5. **E: 評価（evaluateTracks）**

   * 存在・表記一致・年代ゲート（Bがerasを出した時のみ）
6. **F: 整形（finalizeSetlist）**

   * 目標曲数/分数に整え、UI向けに整形
7. **G: 受け取りメモ（runMemoNoteG）**

   * タイトル/抜粋曲から短文メモ生成

---

## 2. 直近の課題

* **テーマ忠実度が弱い**：Bのエッセイが美学に寄り過ぎるケース
* **D2監査→最終に混入**：`drop/replace` 指定の曲が最終へ1件だけ残る事象
* **429（Rate Limit）**：長尺テスト時にSpotify解決リクエストが集中
* **replacement_hint の品質**：テーマとの接続が弱い指示が出ることがある

---

## 3. 改善方針（プロンプト＆設計）

### B（テーマ解釈）

* **テーマ忠実度 × DJ美学の両立**を明記（優先順位を固定しない）
* **平易でストレートな表現**に寄せる（専門用語に偏らない）
* 追加フィールド（任意）：

  * `theme_signals`: テーマを示す具体語（3〜6個）
  * `anti_examples`: 明らかにミスマッチな例
* eras/languages/regions は **明示があれば** `hard_constraints` に落とす

### C（候補出し）

* 各曲の `whyThemeFit` を **テーマ・シグナルに具体接続**して書かせる

  * 例：「〈皆で歌う〉→合唱フック」「〈冬の夜気〉→残響の長いボーカル」
* 「王道/非王道」などの線引きは今は外し、**ニュートラル**に運用

### D2（自己点検）

* チェック観点：**テーマ適合**と**DJらしさ**の両立
* `replacement_hint` は **どの signal に・どんな質感/年代/言語で** を短く指定

---

## 4. デバッグ観測（挙動は変えない）

> 原因特定を優先。**動作は変えずログだけ追加**。

* **D2直後**：issues 正規化＆除去対象の index/keys を保存

  * `D2.audit.json`（既存）
  * `D2.norm.json`（index/action の正規化, dropIdx/dropKeys の記録）
* **E.picked の前後スナップショット**

  * `E.picked.beforeAudit(.indexed).json`
  * `E.picked.afterAudit(.indexed).json`
* **finalize 前後で再混入検知**（任意）

  * `F.preFinalize.snapshot.json`
  * `F.reintroduced.detected.json`
* **系譜**

  * `E.lineage.json`（finalize が “afterAudit” を使っているか）

> 型エラー回避は **`saveRaw(runId, name as any, payload)`** でデバッグ名のみ逃がす。

---

## 5. レート制限（429）対策（実装の考え方）

* **チャンク解決＋スロットリング**：20曲ずつ / チャンク間 0.8–1.2s
* **Retry-After 対応**：429 時はヘッダの秒数を待って同チャンク再試行（最大3回）
* **候補倍率の動的縮小**：長尺ほど倍率を下げる（例：90分×2 → 240分×1.3 など）
* **previewモード**：B/C/D2 だけ確認して D をスキップするモードを用意（本番作成時に解決）

---

## 6. 次のアクション（順序）

1. **ブランチ**：`feat/selection-algorithm`（済）
2. **デバッグログの追加**（挙動変更なし）

   * D2前後・finalize前後・系譜の saveRaw を入れる
3. **再現テスト**：runId を指定して runlog を確認

   * *目的*：「Drop 指定の曲がどの段階で再混入したか」を特定
4. **原因別の本質修正（ミニマム）**

   * index型ズレ → 正規化して比較
   * actionのブレ → lower/trim
   * 同曲再流入 → `dropKeys` を補充/整列/finalize入力すべてで除外
   * E参照ミス → finalizeに渡す集合を`afterAudit`に統一
5. **レート対策の導入**（チャンク解決＋Retry-After）
6. **プロンプト微調整**（B/C/D2の文言をニュートラル版に揃える）

---

## 7. 参考ログの見方（原因特定のためのチェックリスト）

* `D2.norm.dropIdx` に NaN や負数が混じってない？（**index型ズレ**）
* `D2.norm.normalizedIssuesSample` の `action` が `"drop"`/`"replace"` で統一？（**表記ゆれ**）
* `E.picked.beforeAudit.indexed` → `afterAudit.indexed` で該当曲が消えてる？
* `F.reintroduced.detected` が non-empty？（**finalize/補充で再混入**）
* `E.lineage.usedForFinalize` が `"afterAudit"` になってる？

---

## 8. 付録：ブランチ運用メモ

* 作業は **`feat/selection-algorithm`** で進行
* 大きめの観測追加はコミットを分ける（`chore(debug): ...`）
* いつでも戻れるよう、重要ポイントで **タグ** を打つ（例：`predebug-YYYYMMDD-HHMM`）

---
