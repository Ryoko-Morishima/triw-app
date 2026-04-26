ラジオアプリ開発ログ（〜2025/10/03）
0) プロジェクト起点

Vercel と GitHub を接続、triw-app として初期デプロイ準備。

ローカルで npm run build を基準に、最上段エラー1件を直して即再ビルドのループを確立。

1) ビルド・型修正の山

route.ts：オブジェクト構文ミス修正

plan: { memoText, :djComment djNote } → plan: { memoText, djComment: djNote }

画像埋め戻し：FinalizeResult に無いプロパティへのアクセスで型エラー

F を FLike に局所拡張し、F?.tracks ?? F?.setlist ?? F?.items を安全取得。

/mixtape/log/route.ts：getLogs() の引数不一致を解消（ゼロ引数→全件取得→runIdで絞り込み）。

/playlist/page.tsx：SaveToSpotifyButton が disabled prop を受け取らない問題

外側ラップで無効化（opacity-50 pointer-events-none）に変更。

finalize.ts 大整理：

defaults が Omit<> しているキー（programTitle / programOverview / narrativeClassifier）をdefaultsから排除。

運用パラメータ（cfg） と メタ情報（title/overview/classifier） を分離して扱う設計へ。

maxTracksHardCap / targetDurationMin / maxTracks は cfgではなくrest から参照に変更。

runlog.ts：

UiLog 重複定義を解消、サブキー（"D2.audit" 等）も受ける正準型に統一。

getLogs() をマップ返却に実装（{ [runId]: UiLog }）。

url.ts：Next 15+ の headers() が Promise 化

getBaseUrl() を async にして await headers()。呼び出し側も await 対応。

2) 初回ビルド成功 → push → 自動デプロイ

ローカル npm run build が成功。

コミットメッセージ整備（PowerShell の行継続は ^ / 1行推奨などTips共有）。

git push origin main → Vercel が自動デプロイ。

3) 本番での初期動作確認と環境変数

本番URLの把握：https://triw-app.vercel.app（Production 固定）。

Spotify ログインで client_id/redirect_uri 空問題を発見。

原因：環境変数が Preview のみに設定され、Production 未設定。

対処：NEXT_PUBLIC_SPOTIFY_CLIENT_ID / NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SPOTIFY_REDIRECT_URI / SPOTIFY_SCOPES を Production に追加し、Redeploy。

/api/auth/login?debug=1 で authorizeUrl に client_id / redirect_uri が入ることを確認。

Spotify Developer Dashboard 側でも Redirect URI を本番URLで登録。

4) 本番の書き込みエラー解消

ENOENT（/var/task/.triw-runlogs/...）→ Vercel 本番は書込不可。

対処：TRIW_RUNLOG_DIR=/tmp/triw-runlogs を Production に設定し、runlog は /tmp へ。

注意点：/tmp はエフェメラル（短命）＝永続化はしない。

5) プロジェクト整理・ログの見方

複製された Vercel プロジェクトを整理し、triw-app に一本化。

Logs の基本：APIアクセス時のみ記録／Hobbyは保持短い。

Deployments → Production → View Function Logs で確認。

叩いてすぐに見る（時間範囲の変更・Routeフィルタ活用）。

console.log/error を要所に。

6) 第三者テスト & 認証

別ユーザーでの 403 は Spotify アプリが Development Mode の仕様。

Users and Access で テスター追加 → すぐ試せる。

公開運用は Request access to production（審査）へ。

7) 審査に向けた整備

/privacy・/terms ページを追加（英語文面提供）。

Spotify Dashboard の Website / Privacy Policy URL / Terms URL を設定 → 申請ボタン表示へ。

申請用の英語説明テキストを準備。

8) 永続化の方向性（メモ）

現状の runlog は /tmp で非永続。

Vercel Blob を使えば runlogs/{runId}/A.json 形式で永続保存可能（@vercel/blob + トークン）。

代替：S3互換（さくらのオブジェクトストレージ）/ KV / Postgres / Supabase も可。

今日のステータス（10/04 現在）

本番ログインOK、/playlist 動作確認済み。

テスター追加で第三者も利用可能。

申請に必要な法務ページ（/privacy, /terms）の草案用意済み。

永続ログは今後の導入候補：Vercel Blob 案が第一候補。

次の一手（軽く）

Production に /privacy /terms をデプロイ → Dashboard に URL 設定 → Production 申請。

runlog を Vercel Blob 永続化に切り替え（小さめPR）。

Plan API レスポンスに runId を含めてUI表示（デバッグ＆追跡性UP）。

初公開おめでとう！！🚀
このログ、あとで /about に「開発ストーリー」として載せても良さそうだね。必要ならマークダウン版に整えて出すよ。