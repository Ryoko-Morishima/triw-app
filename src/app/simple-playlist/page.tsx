"use client";

import { useState } from "react";

const samplePrompt = `ドライブ中に流すプレイリストを作ってください。

・気分が上がるが、うるさすぎない
・景色に合う心地よさがある
・洋楽・邦楽をバランスよく混ぜる
・年代は90年代〜現在まで幅広く
・ときどき少しだけ意外性のある曲を入れる

合計で約1〜2時間分、15〜25曲程度選んでください。`;

const sampleName = "ドライブミュージック";

export default function SimplePlaylistPage() {
  const [playlistName, setPlaylistName] = useState(sampleName);
  const [prompt, setPrompt] = useState(samplePrompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/playlist/simple-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistName,
          prompt,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.detail || json.rawGptText || json.error || "作成に失敗しました"
        );
      }

      setResult(json);
    } catch (e: any) {
      setError(e.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        🎧 TRIW Simple Playlist
      </h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        プロンプトからSpotifyプレイリストを生成
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold" }}>プレイリスト名</label>
          <input
            value={playlistName}
            onFocus={() => {
              if (playlistName === sampleName) setPlaylistName("");
            }}
            onChange={(e) => setPlaylistName(e.target.value)}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold" }}>プロンプト</label>
          <textarea
            value={prompt}
            onFocus={() => {
              if (prompt === samplePrompt) setPrompt("");
            }}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            style={{
              width: "100%",
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
              lineHeight: 1.6,
            }}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            fontSize: 16,
            borderRadius: 10,
            border: "none",
            background: loading ? "#999" : "#111",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "生成中..." : "プレイリストを作成"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 10,
            background: "#ffe5e5",
            color: "#b00",
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {result?.playlistUrl && (
        <div
          style={{
            marginTop: 32,
            padding: 20,
            borderRadius: 16,
            border: "1px solid #ddd",
          }}
        >
          <h2 style={{ marginBottom: 12 }}>作成完了</h2>

          <a
            href={result.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginBottom: 12,
              color: "#1DB954",
              fontWeight: "bold",
            }}
          >
            ▶ Spotifyで開く
          </a>

          <p style={{ marginBottom: 8 }}>
            追加曲数: {result.addedCount} / {result.candidateCount}
          </p>

          {result.notFound?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>見つからなかった曲</strong>
              <ul style={{ marginTop: 8 }}>
                {result.notFound.map((t: any, i: number) => (
                  <li key={i}>
                    {t.artist} - {t.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}