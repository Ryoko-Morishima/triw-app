# T0 実装前ブリーフ — 実験ログの最小構造化＋保存の冪等性

> tasks/T0-log-minimal-structuring.md の実装者向け補足。タスク定義が正、本ブリーフは現行コードの精読に基づく実装ガイド。
> 検証区分: B（選曲結果に影響しない）。**選曲ロジックの挙動を1ミリも変えないこと**が本タスクの制約。
> 作成: 2026-07-04（コミット時点のコードを精読済み）

---

## 0. まず知るべき現状の構造（精読結果）

ログ系は**2系統**あり、混同しやすい。

### 系統1: 実験ログ（本タスクの主対象）
- 保存先: `triw-experiments/experiments.ndjson`（NDJSON追記）
- 経路: `/program` の保存ボタン → `page.tsx` の `saveExperiment()` が**クライアント側で** result からペイロードを組み立て → `POST /api/experiments/save` → 無条件 `appendFile`
- **現在のペイロードに runId が含まれていない**（savedAt, memo, input, description, promptPlan, prompt, candidates, visibleQueue のみ）。冪等化には runId の追加が前提になる
- 保存APIは重複チェックなし。ログ19/20の重複はボタン二度押し等で説明がつく

### 系統2: RunLog（今回はほぼ触らない）
- 保存先: `triw-runlogs/<runId>.json`（run毎に上書き型 writeFile）
- 経路: `/api/program/tune` の末尾で `saveRunLog()` が自動保存
- runId はここで生成: `tune_${Date.now()}_${ランダム6文字}`（`route.ts` 内）
- こちらは writeFile なので同一 runId の二重保存問題は起きない（上書きされるだけ）

### 評価素材の所在
- title/artist マッチ情報（`title_exact` / `title_contains` / `artist_exact`）は `D.resolved[].spotify.match` にある
- **`visibleQueue` の各トラックの debug には match 情報が入っていない**（popularity, year, uri, role のみ）。採用曲の誤解決判定には **uri をキーに D.resolved と突合する**必要がある
- 年代レンジ判定 `eraSliderToRange` は `evaluateTuneTracks.ts` 内の**非export関数**

---

## 1. 変更対象ファイルの候補

| ファイル | 変更内容 |
|---|---|
| 新設 `src/lib/triw/logs/computeEvaluation.ts` | evaluation自動算出（純関数。入力: input, D, visibleQueue, notFound） |
| 新設 or 同居 `src/lib/triw/logs/conditionKey.ts` | conditionKey 算出（純関数） |
| `src/app/api/program/tune/route.ts` | evaluation / conditionKey / codeVersion / runId をレスポンスと runLogPayload に追加 |
| `src/app/program/page.tsx` | `saveExperiment()` のペイロードに runId, evaluation, conditionKey, codeVersion, changeRef を追加（result から素通しするだけ）。保存ボタンの連打防止（送信中 disabled）も推奨 |
| `src/app/api/experiments/save/route.ts` | runId による重複保存防止 |
| `src/lib/triw/program/evaluateTuneTracks.ts` | **任意・慎重に**: `eraSliderToRange` を export する、または別ファイルへ純移動。ロジックの変更は一切しない |

## 2. 実装の流れ（推奨順）

1. `conditionKey` 純関数を書く（§5）。単体で動作確認
2. `computeEvaluation` 純関数を書く（§5）。tune route が持つ D / visibleQueue / notFound を引数で受ける設計にし、route から呼ぶ
3. tune route で runLogPayload とレスポンスに `evaluation` / `conditionKey` / `codeVersion` を追加（runId は既にペイロードに含まれている。レスポンスにも含まれることを確認）
4. `page.tsx` の `saveExperiment()` に新フィールドを追加（result からの素通し）。changeRef の取得（§5）。ボタン disabled 化
5. 保存APIの冪等化（§6）
6. 確認コマンド一式（§7）を実行

## 3. 絶対に変えてはいけない挙動

- **選曲結果**: candidates / visibleQueue の内容・順序・件数。evaluateTuneTracks のスコアリング・閾値・reject判定。buildVisibleQueue のソートと切り出し
- **レスポンス形状の後方互換**: `page.tsx` は `result.input`, `result.state.description`, `result.promptPlan`, `result.prompt`, `result.C.candidates`, `result.F.visibleQueue`, `result.events` 等を参照している。既存フィールドの削除・改名・ネスト変更は不可（追加のみ）
- **NDJSONの形式**: 1行1JSON＋改行。**pretty-print（JSON.stringifyの第3引数）を入れてはならない**。既存21行の過去ログはそのまま残す（マイグレーション禁止・T5判断事項）
- **RunLog系統（saveRunLog / logStorage / providers）**: ペイロードにフィールドが増えるのは可。保存方式・ファイル名・上書き挙動は変えない
- **レガシー領域**: `src/lib/openai.ts`, `evaluate.ts`, `finalize.ts`, `resolve.ts`, `/mixtape` 系は不可侵（AGENTS.md §3）
- **既存の実験保存フロー**: memoの自由記述、保存成功/失敗のalertは維持してよい（UI改善はスコープ外）

## 4. 事故りやすい点

1. **visibleQueue に match 情報がない問題**。resolveErrors を visibleQueue だけから計算しようとすると詰まる。uri で D.resolved と突合すること。uri 欠落（未解決）や同一uri重複の可能性に防御的に書く
2. **eraSliderToRange の二重実装**。evaluation 側で年代判定を書き直すと、Eの判定と食い違う「第三の定義」が生まれる（T3で潰す非対称を悪化させる）。必ず既存関数の export か純移動で共有する。移動する場合、`evaluateTuneTracks` の挙動が変わっていないことを差分レビューで重点確認
3. **NDJSON汚染**。改行を含む文字列は JSON.stringify がエスケープするので通常安全だが、pretty-print や末尾改行忘れで全体が壊れる。書き込み後に「全行がJSONとしてparseできる」確認を必ず行う（§7）
4. **過去ログに runId がない**。冪等チェックは「runId が存在する行同士」でのみ比較し、runId 欠落行はスキップする実装にする。過去行のparse失敗にも耐えること（try/catchで行単位に読み飛ばし）
5. **Vercel上のファイル書き込み**。serverlessのファイルシステムは永続しない。これは既存実装の既知の制約であり、**T0で解決しようとしないこと**（Blob化はスコープ外）。動作確認はローカル dev で行う
6. **クライアント側での evaluation 計算に流れない**。saveExperiment はクライアントにあるが、evaluation は必ずサーバ（tune route）で算出し、クライアントは素通しにする。算出ロジックの置き場所が2つになると以後ずっと祟る
7. **talkEnabled や title/description を conditionKey に含めてしまう**。description は input から自動生成される派生値、talkEnabled は現状選曲に無関係。含めると同一条件のrunが別グループに割れる（§5参照）
8. **`0;` のような既存の奇妙なコード**（page.tsx 45行目付近に無意味な式文がある）。見つけても本タスクでは触らない。気になるものは新タスク起票（tasks/README.md）

## 5. conditionKey / runId / codeVersion の設計方針

### conditionKey
- **目的**: 「同一入力条件のrun」を機械的にグルーピングし、実行間多様性(diversityInter)を後算出可能にする
- **含める**: `keywords`（重複排除・ソート済み配列）、`era`、`temperature`、`popularity`（いずれも Number 化した生値）、`mode`、`count` または `duration`（modeに応じた方のみ）
- **含めない**: title / description（inputからの派生値）、talkEnabled（現状選曲に無関係）、memo / changeRef
- **生値かレベルか**: スライダーは**生値（0-100）を使う**。レベル（5段階）に丸めたくなるが、Eの年代判定（eraSliderToRange）の刻みはUIレベル境界と一致していないため、丸めると「実は挙動が違う条件」を同一視する危険がある。丸めの導入は T3（語彙統一）後に再検討
- **形式**: 正規化オブジェクト → キー順固定の JSON.stringify → 短いハッシュ（例: sha1 先頭12桁。Node標準 `crypto` で可、新規依存は入れない）。**正規化前のオブジェクトもログに残す**（`conditionNormalized` 等）とデバッグが楽

### runId
- **既存の生成（tune route の `tune_<epoch>_<rand6>`）をそのまま使う**。新設しない
- 実験ログのペイロードに runId を追加し、RunLog（系統2）と突合可能にする。これが冪等化のキーにもなる

### codeVersion / changeRef
- `codeVersion`: 優先順で `process.env.VERCEL_GIT_COMMIT_SHA`（Vercelが自動注入）→ `process.env.TRIW_CODE_VERSION`（ローカルで手動設定 or 起動スクリプトで `git rev-parse --short HEAD` を注入）→ `"dev"`。**git コマンドをランタイムで実行しない**（serverlessで死ぬ）
- `changeRef`: 検証セッション単位の識別子。最小実装は環境変数 `TRIW_CHANGE_REF`（例: `T1a-before` / `T1a-after`）。UIの入力欄追加は任意（memo欄の隣に置くなら小さく）。**空なら null で保存**し、区分A検証時には必ず設定する運用を AGENTS.md §4 が担保する

## 6. 保存の冪等性の実装方針

- 実装場所: `POST /api/experiments/save`（サーバ側。クライアントのボタンdisabledは補助であって本体ではない）
- 方式: 保存前に `experiments.ndjson` を読み、各行を行単位でparseし（壊れた行・runId欠落行はスキップ）、**同一 runId の行が既にあれば追記せず `{ ok: true, duplicated: true }` を返す**。エラー(500)にはしない——UI側のalertを「保存失敗」にしないため。レスポンスに duplicated を含め、UIは「保存済みです」と出し分けてよい（出し分けは任意）
- runId が無いリクエストは、後方互換のため**従来通り追記を許す**か、400で弾くかを実装者が選ぶ。推奨は「runId必須化＋page.tsx側で必ず付与」（新規保存経路は自分たちのUIだけなので破壊的でない）。選んだ方針を作業記録に残すこと
- 同時書き込み競合（read→check→append の隙間）は単一ユーザーのローカル運用では実害が薄い。ロック機構は**入れない**（過剰設計）。制約として作業記録に明記すればよい
- ファイルスケール: 現状21行。全行読みで問題ない。将来的な肥大はT5で扱う

## 7. 実装後の確認コマンド

```bash
# 1. 型チェック（区分B必須）
npx tsc --noEmit

# 2. 起動確認（区分B必須）
npm run dev
# → http://127.0.0.1:3000/program で1回実行し、保存ボタンを「2回」押す

# 3. NDJSONの健全性: 全行がJSONとしてparseできるか
python3 -c "
import json,sys
ok=0
for i,l in enumerate(open('triw-experiments/experiments.ndjson')):
    l=l.strip()
    if not l: continue
    json.loads(l); ok+=1
print('parsed lines:', ok)"

# 4. 新フィールドの存在確認（最終行）
python3 -c "
import json
e=[json.loads(l) for l in open('triw-experiments/experiments.ndjson') if l.strip()][-1]
for k in ['runId','conditionKey','codeVersion','changeRef','evaluation']:
    print(k, '->', json.dumps(e.get(k), ensure_ascii=False)[:120])"

# 5. 冪等性確認: 同一runIdが1件しかないこと（2回押した後で）
python3 -c "
import json,collections
ids=[json.loads(l).get('runId') for l in open('triw-experiments/experiments.ndjson') if l.strip()]
dup={k:v for k,v in collections.Counter(i for i in ids if i).items() if v>1}
print('duplicated runIds:', dup or 'none')"

# 6. evaluation の中身のサニティ
#    - keywordFit が null
#    - eraFit: era=50付近で score:"na"、era=0 で violations が整数
#    - diversityIntra.maxSameArtist >= 1
#    - notFoundCount >= 0
```

加えて手動確認: era=0 と era=100 でそれぞれ1回実行し、eraFit の violations が「目視でリストを数えた値」と一致すること（自動算出の正しさは最初の1回だけ人手で照合する）。

## 8. 差分レビュー時に見るべきポイント

1. **`evaluateTuneTracks.ts` の diff**: eraSliderToRange の export/移動以外に1文字も変わっていないか。スコア・閾値・reasons 文言の変更は即差し戻し
2. **`buildVisibleQueue.ts` / `buildSelectionPrompt.ts` / C・D 系**: diff が存在しないこと（存在したらスコープ逸脱）
3. **NDJSON書き込み箇所**: `JSON.stringify(x) + "\n"` の形が維持されているか（第2・第3引数が増えていないか）
4. **レスポンス形状**: tune route の返却オブジェクトが「追加のみ」か。既存キーの削除・改名がないか
5. **evaluation の算出位置**: サーバ側のみか。page.tsx に計算ロジックが漏れていないか（素通しであること）
6. **冪等チェックの防御**: 壊れた行・runId欠落行で例外が飛ばないか。duplicated 時に 500 を返していないか
7. **新規依存**: package.json に diff がないこと（crypto は Node 標準）
8. **keywordFit**: `null` リテラルで保存されているか（`""` や `"na"` になっていないか。T5 の入力実装が型で困る）
9. **レガシー領域・`/mixtape` 系**: diff ゼロ
10. **AGENTS.md §5 との整合**: スキーマ記述と実装に差分が出たら、AGENTS.md 側の更新もコミットに含まれているか
