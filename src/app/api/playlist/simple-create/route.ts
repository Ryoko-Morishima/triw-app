import { cookies } from "next/headers";

export const runtime = "nodejs";

type TrackCandidate = {
  artist: string;
  title: string;
};

export async function POST(req: Request) {
  const jar = await cookies();
  const accessToken = jar.get("spotify_access_token")?.value;

  if (!accessToken) {
    return Response.json(
      { error: "Spotifyにログインしていません" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const playlistName = body.playlistName || "ドライブミュージック";

  const prompt =
    body.prompt ||
    `
ドライブ中に流すプレイリストを作ってください。

・気分が上がるが、うるさすぎない
・景色に合う心地よさがある
・洋楽・邦楽をバランスよく混ぜる
・年代は90年代〜現在まで幅広く
・ときどき少しだけ意外性のある曲を入れる

合計で約2〜3時間分、30〜40曲程度選んでください。

以下の形式でJSONのみで出力してください：
[
  { "artist": "...", "title": "..." }
]
`;

  // ===== GPTで選曲 =====
  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "あなたは音楽プレイリストを作るAIです。Spotifyで見つかりやすい正式なアーティスト名と曲名を使ってください。回答はJSONのみ。説明文やMarkdownコードブロックは絶対に付けないでください。",
        },
        {
          role: "user",
          content:
            prompt +
            `

重要：
出力は必ず次のJSON配列だけにしてください。
説明、見出し、コードブロックは禁止です。

[
  { "artist": "...", "title": "..." }
]`,
        },
      ],
      temperature: 0.8,
    }),
  });

  if (!gptRes.ok) {
    const text = await gptRes.text().catch(() => "");
    return Response.json(
      { error: "GPTで選曲できませんでした", detail: text },
      { status: 500 }
    );
  }

  const gptJson = await gptRes.json();
  const text = gptJson.choices?.[0]?.message?.content;

  if (!text) {
    return Response.json(
      { error: "GPTの返答が空でした" },
      { status: 500 }
    );
  }

  let tracks: TrackCandidate[];

  try {
    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    if (Array.isArray(parsed)) {
      tracks = parsed;
    } else if (Array.isArray(parsed?.playlist?.songs)) {
      tracks = parsed.playlist.songs;
    } else if (Array.isArray(parsed?.songs)) {
      tracks = parsed.songs;
    } else {
      throw new Error("曲リストの形式が違います");
    }
  } catch {
    return Response.json(
      {
        error: "GPTの返答をJSONとして読み取れませんでした",
        rawGptText: text,
      },
      { status: 500 }
    );
  }

  // ===== Spotifyユーザー取得 =====
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!meRes.ok) {
    return Response.json(
      { error: "Spotifyユーザー情報の取得に失敗しました" },
      { status: 500 }
    );
  }

  const me = await meRes.json();

  // ===== プレイリスト作成 =====
  const playlistRes = await fetch(
    `https://api.spotify.com/v1/users/${me.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName,
        public: false,
        description: "Created by TRIW simple playlist maker",
      }),
    }
  );

  if (!playlistRes.ok) {
    const text = await playlistRes.text().catch(() => "");
    return Response.json(
      { error: "プレイリスト作成に失敗しました", detail: text },
      { status: 500 }
    );
  }

  const playlist = await playlistRes.json();

  // ===== 曲検索 =====
  const foundTracks: any[] = [];
  const notFound: TrackCandidate[] = [];

  for (const t of tracks) {
    const q = encodeURIComponent(`track:"${t.title}" artist:"${t.artist}"`);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!searchRes.ok) {
      notFound.push(t);
      continue;
    }

    const searchJson = await searchRes.json();
    const item = searchJson.tracks?.items?.[0];

    if (item?.uri) {
      foundTracks.push(item);
    } else {
      notFound.push(t);
    }
  }

  const uris = foundTracks.map((t) => t.uri);

  // ===== 曲追加 =====
  if (uris.length > 0) {
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris }),
      }
    );

    if (!addRes.ok) {
      const text = await addRes.text().catch(() => "");
      return Response.json(
        { error: "曲の追加に失敗しました", detail: text },
        { status: 500 }
      );
    }
  }

  return Response.json({
    ok: true,
    playlistName,
    usedPrompt: prompt,
    rawGptText: text,
    playlistUrl: playlist.external_urls?.spotify,
    candidateCount: tracks.length,
    addedCount: uris.length,
    tracks: foundTracks.map((t) => ({
      title: t.name,
      artist: t.artists?.map((a: any) => a.name).join(", "),
      url: t.external_urls?.spotify,
    })),
    notFound,
  });
}