"use client";

import { useEffect, useState } from "react";

export default function ProgramPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [error, setError] = useState("");

  const current = events[currentIndex];

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

  function goNext() {
    setCurrentIndex((i) => Math.min(i + 1, events.length - 1));
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

              {current.track?.reason && (
                <p style={{ marginTop: 16 }}>{current.track.reason}</p>
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

            <button onClick={goNext} disabled={currentIndex >= events.length - 1}>
              次へ ▶
            </button>
          </div>
        </section>
      )}

      {result && (
        <section style={{ marginTop: 40 }}>
          <h2>Raw Result</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}