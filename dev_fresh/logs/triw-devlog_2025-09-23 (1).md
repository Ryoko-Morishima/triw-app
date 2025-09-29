# TRIW 開発日誌 2025-09-23

## 概要
- **年代ゲートの厳格化（E）** と **Era 抽出** を導入し、番組タイトル/概要で「90s」等を指定した回は **範囲外の曲を不採用** にできるようにした。
- **Spotify 原盤年推定（D）** のために `searchTracksByISRC` を追加。ISRC クラスターから **最古年=原盤年推定** を算出。
- `next.config.js` の **非公式オプション削除** により、起動時警告を解消。
- いくつかのコピーミス由来のビルドエラーを修正（`eraFromText` 未定義、関数呼び出しの括弧閉じ忘れ）。
- GitHub にセーブポイントを作成。

## 変更点（ファイル別）
### `src/lib/spotify.ts`
- 追加: `export async function searchTracksByISRC(token: string, isrc: string, limit = 50)`
- 既存: `getTrack`, `getAudioFeatures`, `searchTrackBestEffort` 等は据え置き
- 目的: **D段階**で `original_release_year` を推定するための材料を増やす

### `src/lib/resolve.ts`
- `searchTracksByISRC` を利用して、各曲の ISRC クラスターを検索
- `original_release_year` を導出し、`is_reissue` を算出

### `src/lib/evaluate.ts`（E段階）
- **ハード年代ゲート**を導入
  - `opts.year_gate` が ON で、
    - Era が取れた場合: **Era 範囲外は無条件で reject**
    - Era が取れない場合: `year_guess ± 3` に収まらない場合は **reject**
- スコア設計は維持（exist + match + year_on_match）。ハードゲートは最終判定で適用。

### `src/app/api/mixtape/plan/route.ts`
- 既存 `hasDecadeHint()` に加えて **`parseEra()`** を追加（年代範囲抽出）
- E呼び出し前に `eraFromText` を生成し、`evaluateTracks(..., { year_gate, era: eraFromText })` へ渡す
- コピーミス修正（関数呼び出しの閉じ括弧）

### `next.config.js`
- 非公式 `experimental.allowedDevOrigins` を削除し、シンプル化

## バグ/エラーと対処
- `Cannot find name 'eraFromText'` → **`const eraFromText = ...` の宣言を追加**
- `Expected ',', got 'await'` → **`evaluateTracks(...)` 呼び出しの `);` を閉じてから `await saveRaw(...)`**
- ⚠ Invalid next.config.js options: `'allowedDevOrigins'` → **削除して警告解消**

## 動作確認メモ
- タイトル/概要に `90s`（または `90年代`）を含むケースで実行
- **期待**: `E.json` の `reason` に `Era一致` / `年代外（Era 1990-1999）` が出力
- `D.json` で `spotify.original_release_year` が入っていること（無い場合は ISRC 未ヒットの可能性）

## Git セーブポイント
- コミットメッセージ（例）:
  - `feat(evaluate): hard decade gate & parseEra`
  - `feat(spotify): add searchTracksByISRC for original year clustering`
  - `chore(next): remove experimental.allowedDevOrigins warning`
- タグ: `save/2025-09-23_era-gate`

---

## 次にすぐ始めるための要点（明日のスタート用）
1. **UI 着手（最小）**
   - `E.json` / `F` の可視化（ピック/リジェクト・理由・年代表示）
   - 「Spotify に保存」ボタン（`F` の URI 群を POST → プレイリスト作成）
2. **Spotify プレイリスト作成 API（新規）**
   - ルート案: `POST /api/playlist/create`
   - 入力: `{ name, description, uris: string[] }`
   - 実装: `requireSpotifyToken` → `getMe` → `createPlaylist` → `addTracks`
3. **フロント連携**
   - `F` の採用曲から URI 配列を作成して送信
   - 成功時に **Spotify への外部リンク** を表示
4. **テストシナリオ**
   - 90s 番組（10曲/30分）で 2〜3パターン検証
   - Era 外が混入しないこと、分数/曲数が合うことを確認

### UI/API 最小スケルトン（新規ファイル提案）
> ※ “新規”なので、そのまま追加してOK。既存コードの修正は含まない。

**`src/app/api/playlist/create/route.ts`**
```ts
import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyToken, getMe, createPlaylist, addTracks } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const uris: string[] = Array.isArray(body?.uris) ? body.uris.filter(Boolean) : [];

    if (!name || uris.length === 0) {
      return NextResponse.json({ error: "name と uris は必須です" }, { status: 400 });
    }

    const token = await requireSpotifyToken();
    const me = await getMe(token);
    const pl = await createPlaylist(token, me.id, name, description || "Created by TRIWinDev");

    await addTracks(token, pl.id, uris);

    return NextResponse.json({
      playlistId: pl.id,
      playlistUrl: pl?.external_urls?.spotify ?? null,
      name: pl.name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
```

**（フロント）例：保存ボタン**  
`components/SaveToSpotifyButton.tsx`（仮）
```tsx
"use client";
import { useState } from "react";

export function SaveToSpotifyButton({ uris, name, description }: { uris: string[]; name: string; description?: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    try {
      setLoading(true);
      setError(null);
      setUrl(null);
      const res = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, uris }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      setUrl(json.playlistUrl || null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading || uris.length === 0}
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save to Spotify"}
      </button>
      {url && (
        <a className="underline" href={url} target="_blank" rel="noreferrer">Open playlist</a>
      )}
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}
```

### 明日の開始コマンド（最小）
```powershell
cd D:\work\triw\triw-app
git pull
npm run dev
```

---

## 付記（リスク/メモ）
- 原盤年は ISRC クラスターに依存。配信面のデータ差があるため **常に取れるとは限らない**。
- Era 抽出はまず十年単位対応。`early/late` の表現は将来拡張予定。
- プレイリスト保存には `playlist-modify-private` スコープが必要（現状 .env 設定済）。
