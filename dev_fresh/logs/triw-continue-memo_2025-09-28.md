# 開発継続メモ（TRIW MIXTAPE / 2025-09-28）

## プロジェクト概要
Next.js アプリ（**triw-app**）。ユーザーのテーマに合わせて **DJ が選曲した MIXTAPE** を生成し、**AIメモ（受け取りメッセージ）**＆**カバー画像**を表示、**Spotify プレイリストに保存**。  
主要フロー：`/api/mixtape/plan` → **A/B/C/D/E/F** の段階処理 → フロントで表示。

---

## 直近の成果（要点）
- **AIメモ生成**：`runMemoNoteG`（`src/lib/openai.ts`）で `memoText` を作成。空返り時はフォールバック：  
  `「{title}」をテーマに選曲しました。気に入ってくれるかな？
by {DJ}`
- **レスポンス整備**：トップレベルにも **plan 内**にも `memoText`（AI）と `djComment`（B要約）を返却（当面は両対応）。
- **ジャケット表示**：`finalizeSetlist()` 後に **D の画像を F に“埋め戻し”**（`cover` を補完）。UI 側は `covers` を渡せば並ぶ。
- **UI**：`MixtapeSummarySheet`… 見出し＝タイトル、本文＝AIメモ、**メモ直下にカバー**（`grid / strip` 切替可）。
- **設定UI折りたたみ**：1〜4 の設定を `<details>` で包み、**生成完了で自動クローズ**。
- **DJ紹介文の簡潔化**：`tagline ?? description` の先頭文を **28 文字**に丸めて `DJCard` へ。
- **runlogs の Git 無視**：`.gitignore` 追加＆追跡解除（`triw-runlogs/`）。

---

## 重要ファイルと責務
- `src/lib/openai.ts`  
  `runPersonaA` / `runInterpretB` / `runCandidatesC` / `runMemoNoteG`  
  JSON 呼び出しユーティリティ：`callOpenAIJSON` / `requestJson` / `safeParseJson`
- `src/app/api/mixtape/plan/route.ts`  
  A〜F 実行／`buildRecipientMemo` 経由で `memoText` 生成  
  **D→F 画像埋め戻し**（F 各曲に `cover` を補完）  
  **レスポンス**：`{ runId, title, description, ..., memoText, djComment, F, plan: { memoText, djComment } }`
- `src/components/MixtapeSummarySheet.tsx`  
  見出し＝タイトル、本文＝AIメモ、**メモ直下にカバー**（`coverVariant="grid"|"strip"`, `maxCovers`）
- `src/app/playlist/page.tsx`  
  `details/summary` で設定 UI を折りたたみ（生成後に `builderOpen=false`）  
  **レスポンス形の差異を吸収**して `memo` を抽出、`Sheet` に渡す  
  `DJCard` へ簡潔な紹介文を渡す（`tagline` 優先）

---

## データフロー／UI 取り出し（重要）
```ts
// 受け取り直後（フロント）
const planObj = (data as any)?.plan ?? (data as any);
const memo = planObj?.memoText ?? planObj?.djComment ?? "";

// 表示
<MixtapeSummarySheet
  title={data?.title ?? "Untitled Mixtape"}
  memo={memo}
  covers={covers}
/>
```

**カバー抽出（`page.tsx` 内ヘルパ）**：`extractFinalTracks(plan?.F) → coversFrom(finalRaw)`  
※ 画像は `F.track.cover` を期待。足りない場合は **サーバー側で埋め戻し済み**。

---

## 環境変数・運用
- **必須**：`OPENAI_API_KEY`（必要なら `OPENAI_MODEL=gpt-4o-mini`）
- **任意（ローカルのみログ保存）**：`ENABLE_RUNLOG=true`
- `.gitignore` に `triw-runlogs/`, `.triw-runlogs/`, `triw-runlogs-*/` 追加済み  
  → 既存追跡分は `git rm -r --cached triw-runlogs` 済み

---

## 既知の課題／TODO（優先順）
- [ ] **API 返却を `plan` に一本化**（トップレベルの `memoText`/`djComment` は将来的に廃止）＋ **型 `MixtapePlan` を定義**
- [ ] 画像 `<img>` に `loading="lazy"` を付与、**重複カバー URL の排除**（`Set`）
- [ ] `finalizeSetlist` 内で **正式に `cover` を保持**（route の“埋め戻し”は暫定 → 本実装へ）
- [ ] `MixtapeSummarySheet` に **`coverVariant` の UI 切替**（ボタン／トグル）
- [ ] OpenAI 失敗時 **フォールバックの多行テンプレ（2〜3行版）**を用意
- [ ] **runlogs の保存先／命名の整理**（`RUNLOG_DIR` 環境変数対応）

**（拡張・技術負債の解消）**
- [ ] A–F パイプラインの **型定義** と **I/O スキーマの固定化**
- [ ] **テスト用 seed** 固定（安定比較用のスナップショット出力）

**（既存の方針メモから）**
- [ ] **年ゲート（year gate）** を必要時に有効化
- [ ] **Spotify ISRC 検索** を resolve パイプラインに追加

---

## デバッグ Tips（再現時に見る場所）
- **メモが出ない**：上記の `planObj` / `memo` 取り出し式を確認。`console.log(memo)` で中身を見る。
- **カバーが出ない**：`F.json` の各曲に `cover` があるか（無ければ **D→F 埋め戻し漏れ**）。
- **OpenAI SDK エラー**：`import OpenAI from "openai";` は **`openai` パッケージが必要**（`npm i openai`）。

---

## ブランチ／PR
- **ブランチ**：`feat/mixtape-memo-covers`（PR 作成済み。未マージなら **Squash and merge** 推奨）
- **マージ後ローカル更新（最小手順）**
  ```bash
  git checkout main
  git pull
  git branch -d feat/mixtape-memo-covers
  ```

---

## 次の一手（今日の 3 ステップ）
1. **`MixtapePlan` 型と `plan` 一本化**（route とフロントの参照箇所を同時更新）。
2. **カバーの `loading="lazy"` + 重複排除**（`coversFrom` でユニーク化）。
3. **`coverVariant` 切替 UI**（`grid` ↔ `strip`）。

— end —
