A〜Fの通し流れ（今回のコード構成）

A: ペルソナ生成
runPersonaA()
選択DJ（or custom）の設定から、番組に合わせたDJペルソナを整える。

B: 番組解釈
runInterpretB()
Aのペルソナ視点で「狙い・流れ・制約」などをテキスト化。

C: 候補曲出し
runCandidatesC()
目標曲数（or 分数）に合わせて下書き候補（title/artist/年推定など）を列挙。

D: Spotify解決（ここでSpotifyへ実リクエスト） ✅
resolveCandidatesD()

searchTrackBestEffort() で曲IDを当てる

getTrack() で詳細（popularity, preview, album.images, release_date, ISRC など）

ISRCでクラスター検索（searchTracksByISRC()）→最古年を原盤年推定

getAudioFeatures()（tempo, energy など）
→ resolved[]（Spotify情報付き）と notFound[] を返す

E: 採否評価（スコアリング＆ふるい） ✅
evaluateTracks()

Spotifyアクセスはしない（Dの結果を使うだけ）

存在確認 / タイトル・アーティスト表記マッチ（exact/fuzzy） / 年代ゲート（必要時。原盤年を優先）で confidence を算出

しきい値（0.50）で picked と rejected に分ける

出力：{ picked: Evaluated[], rejected: Evaluated[] }（各曲に理由・デバッグ付き）

F: 最終整形（並べ替え・本数/分数合わせ・体裁） ✅
finalizeSetlist()

入口：E.picked

mode=count/duration に応じて曲数や分数を合わせる

並べ替え（流れが良くなるように）、必要に応じて間引き

オプション（今回の呼び出しパラメータ）:

interleaveRoles: true（役割を交互に織り交ぜる狙い）

artistPolicy: "auto"（番組タイトル/概要から“特集”か自動推定）

shortReason: true（理由コメントを短く）

countモード: maxTracks を上限
durationモード: targetDurationMin / maxTracksHardCap

出力：最終セット F（UIに渡す完成プレイリスト）