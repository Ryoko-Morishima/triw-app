"use client";

import { useEffect, useState } from "react";

export default function ProgramPage() {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [error, setError] = useState("");

  const current = events[currentIndex];

  // 仮の自動進行（まだ本格じゃない）
  useEffect(() => {
    if (!events.length || !autoPlay) return;

    const timer = setTimeout(() => {
      setCurrentIndex((i) => {
        if (i >= events.length - 1) return i;
        return i + 1;
      });
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, events, autoPlay]);

  async function createProgram() {
    setLoading(true);
    setError("");
    setResult(null);
    setEvents([]);
    setCurrentIndex(0);
    setAutoPlay(false);

    try {
      const res = await fetch("/api/program/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "テスト番組",
          description: "夜に聴く少し落ち着いた曲",
          djId: "Techne",
          mode: "count",
          count: 2,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(JSON.stringify(data, null, 2));
        return;
      }

      setResult(data);
      setEvents(data.events || []);
      setCurrentIndex(0);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // エラーを人間用に変換（Day8）
  function humanizeError(text: string) {
    if (!text) return "不明なエラー";

    if (text.includes("NO_ACTIVE_DEVICE")) {
      return "Spotifyアプリで一度再生してください";
    }
    if (text.includes("Permissions")) {
      return "Spotifyの権限が不足しています（再ログインしてください）";
    }
    if (text.includes("401")) {
      return "ログインが切れています。再ログインしてください";
    }

    return text;
  }

  async function playTrackByUri(uri: string) {
    setPlaying(true);
    setError("");

    try {
      const res = await fetch("/api/spotify/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uri }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data?.detail || data?.error || "再生に失敗しました";

        setError(humanizeError(message));
        return;
      }

      console.log("play ok");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setPlaying(false);
    }
  }

  async function playCurrentTrack() {
    if (current?.type !== "track" || !current.track?.uri) {
      setError("再生できるtrack uriがありません。");
      return;
    }

    await playTrackByUri(current.track.uri);
  }

  // Day7：次へ＋再生
  async function goNextAndPlay() {
    const nextIndex = Math.min(currentIndex + 1, events.length - 1);
    const nextEvent = events[nextIndex];

    setCurrentIndex(nextIndex);

    if (nextEvent?.type === "track" && nextEvent.track?.uri) {
      try {
        await playTrackByUri(nextEvent.track.uri);
      } catch {
        // 失敗しても止まらない
      }
    }
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <h1>TRIW Program Test</h1>

      <button onClick={createProgram} disabled={loading}>
        {loading ? "生成中..." : "番組生成テスト"}
      </button>

      {error && (
        <>
          <h2>エラー</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        </>
      )}

      {events.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>{result?.title ?? "Now Playing"}</h2>

          {result?.description && <p>{result.description}</p>}

          <p>
            {currentIndex + 1} / {events.length}
          </p>

          <button onClick={() => setAutoPlay((v) => !v)}>
            {autoPlay ? "自動進行ON" : "自動進行OFF"}
          </button>

          {current?.type === "track" && (
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: 12,
                padding: 20,
                marginTop: 12,
              }}
            >
              <p style={{ fontSize: 14, opacity: 0.7 }}>TRACK</p>

              <h3 style={{ fontSize: 28, margin: "8px 0" }}>
                🎵 {current.track?.title ?? "タイトル不明"}
              </h3>

              <p style={{ fontSize: 18 }}>
                👤 {current.track?.artist ?? "アーティスト不明"}
              </p>

              <button onClick={playCurrentTrack} disabled={playing}>
                {playing ? "再生リクエスト中..." : "▶ この曲を再生"}
              </button>

              {current.track?.reason && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "#f5f5f5",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <strong>選曲理由</strong>
                  <p style={{ marginTop: 8 }}>{current.track.reason}</p>
                </div>
              )}
              {current.track?.uri && (
                <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                  {current.track.uri}
                </p>
              )}
            </div>
          )}

          {current && current.type !== "track" && (
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: 12,
                padding: 20,
                marginTop: 12,
              }}
            >
              <p>{current.type}</p>
              <pre>{JSON.stringify(current, null, 2)}</pre>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button onClick={goPrev} disabled={currentIndex <= 0}>
              ◀ 前へ
            </button>

            <button
              onClick={goNextAndPlay}
              disabled={playing || currentIndex >= events.length - 1}
            >
              次へ＆再生 ▶
            </button>
          </div>
          <section style={{ marginTop: 40 }}>
            <h2>Events一覧</h2>
          
            {events.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: 8,
                  marginBottom: 4,
                  background: i === currentIndex ? "#eef" : "#fafafa",
                }}
              >
                {i + 1}. {e.type === "track"
                  ? `🎵 ${e.track?.title} / ${e.track?.artist}`
                  : e.type}
              </div>
            ))}
          </section>

        </section>
      )}

            {result && (
        <section style={{ marginTop: 40 }}>
          <h2>Day9 Debug Log</h2>

          <p>
            <strong>runId:</strong>{" "}
            <code>{result.runId ?? "runIdなし"}</code>
          </p>

          <details open>
            <summary>入力内容 input</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result.input, null, 2)}
            </pre>
          </details>

          <details>
            <summary>E：Spotify解決あたり</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result.E, null, 2)}
            </pre>
          </details>

          <details>
            <summary>F：最終採用トラック</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result.F, null, 2)}
            </pre>
          </details>

          <details open>
            <summary>events：番組イベント</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result.events, null, 2)}
            </pre>
          </details>

          <details>
            <summary>Raw Result 全部</summary>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}