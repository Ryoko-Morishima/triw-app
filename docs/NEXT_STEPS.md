# NEXT_STEPS.md — 引き継ぎメモ（2026-07-07）

## 今日完了したこと

- Persona A固定化（runPersonaA廃止、djs.tsのdescriptionを直接使用）
- D2自己監査の3つのバグ修正（index不一致、replace除去漏れ、refillでの復活）
- mixtapeのタイトル入力欄の初期値バグ修正（useState("MIXTAPEのタイトル") → useState("")）
- 上記すべて、mainにマージ済み（PR #3, PR #4）
- カスタムDJ機能は既に実装・動作確認済み（新機能ではない）
- mixtapeとtuneは同じリポジトリ内の別ルートとして運用する方針で確定

## 次回やるべきことの優先順位

1. RunLogの永続化（Vercel上で参照できるようにする）
2. 選曲処理が遅い（約92秒）原因の調査
3. 評価記録機能（まずは星1-5+一言コメント程度のシンプルな形）
4. タイトルの自動選択（毎回生成せず、季節/時候イベント + DJ固有の候補をあらかじめ用意しておき、その中から選ぶ方式）
5. RunLogのUI改善（D/E表示の追加、採用曲への「✓」マーク表示）
6. 選曲過程を面白く見せる裏ページ
7. B（テーマ解釈）・プレイリスト作成時のチェック精度改善
8. mixtape/playlistでのアーティスト重複・バージョン違い問題の修正（下記参照）

## 2026-07-08 追記（コード変更なし、文脈整理のみ）

### triwxへの移行
- tune/program（曲を止めずに流し続けるラジオ体験）は作り直され、別リポジトリ「triwx」に移行済み。
- triw-app内の `src/app/program/**`・`src/app/api/program/**`・`src/lib/triw/**` は、今後この観点での開発対象ではない。
- mixtape/playlist（カセットテープにふきこんで友達に渡す体験）とtune/program（ラジオ体験）は「旧世代/新世代」ではなく、そもそも別コンセプトの2つの製品。土台の選曲エンジンを共有しているだけ。

### 既知の不具合: mixtape/playlistでのアーティスト重複・バージョン違い
実例（2面構成のミックステープ出力）で以下が同時に発生：
- 同一アーティストが2〜3回登場（Dave Brubeck, Herbie Hancock, Duke Ellington, Ella Fitzgerald, John Coltrane など）
- 同一曲・同一アーティストの別バージョン（"Take Five" / "Take Five (Live)"、Dave Brubeck）
- 同一曲タイトルの別アーティストによるカバー（"A Night in Tunisia" / Dizzy Gillespie と "Night in Tunisia" / Art Blakey）

**修正時の必須条件**: アーティスト重複を一律で弾くロジックにしないこと。プレイリストのタイトルや概要が「ビートルズ三昧」「ビートルズの名曲集」のように単一アーティストへの集中を意図している場合は、重複はバグではなく正しい挙動であり、むしろそのアーティストの曲を積極的に集めるべき。`finalize.ts`の`artistPolicy`に手を入れる際は、まずプレイリストの意図（テーマ）が単一アーティスト集中かどうかを判定し、そうでない場合にのみ多様性の制約をかける設計にすること。

## 2026-07-08 完了したこと

- **replacement_hintが補充候補生成に反映されていない問題の修正**
  - D2自己監査（`runSelfAuditD`）が生成する`replacement_hint`は、`D2.replaceHints`としてログ保存されるだけで、実際の補充候補生成（`runCandidatesC`）には一切渡っていなかった（3箇所の呼び出し元すべてで未使用）。
  - `runCandidatesC`（`src/lib/openai.ts`）に`replacementHints`パラメータを追加し、userプロンプトに「置換ヒント（必ず考慮すること）」という専用セクションとして明示的に反映。あわせて`matched_hint_index`を候補スキーマに追加し、どの候補がどのヒントに応えたかをログで追えるようにした。
  - `src/app/api/mixtape/plan/route.ts`側で、D2が検出した`replacement_hint`を、補充候補生成の3箇所の呼び出し元すべてに配線。あわせて、これまでログに残っていなかった2箇所の再補充結果（`C.refill2.countMode`、`C.refill2.durationMode.roundN`）もログ保存するようにした。
  - 検証: 実際にOpenAI APIを叩いて確認済み。ヒントなしでは一般的な英語のドライブソング（WALK THE MOON、Rihannaなど）が返るのに対し、「1960年代フランスのイエイエポップ、女性ボーカル、フランス語詞」というヒントを与えると"Laisse tomber les filles"「Les Sucettes」（France Gall）が選ばれ、`matched_hint_index`にも正しく1が付与されることを確認した。
  - コミット: `263b127 fix(mixtape): wire replacement_hint into refill candidate generation`

### 要調査: D2自己監査がreplaceよりdropを選びがちかもしれない
上記の検証中に見つかった副次的な所見。ジャンル違いの曲（例: シティポップ選曲の中に混ぜたアニソン曲）をD2自己監査に渡すテストを2回行ったところ、どちらも`action: "replace"`ではなく`action: "drop"`が選ばれ、`replacement_hint`自体が生成されなかった。サンプル数が少なく断定はできないが、もし実運用でも同様の傾向があるなら、今回配線した`replacementHints`の恩恵を受けられる場面自体が少ない可能性がある。`runSelfAuditD`のプロンプト（`src/lib/openai.ts`）でdrop/replaceの判断基準がどう書かれているか、また実際のrunlogで`D2.audit`のaction内訳（drop/keep/replaceの比率）を確認するところから着手するとよい。
