"use client";

import { useEffect, useState } from "react";

import {
  getKeywordCards,
  getKeywordCategories,
} from "@/lib/triw/input/cards/keywordCards";

import {
  sliderControls,
  type SliderId,
  getSliderText,
} from "@/lib/triw/input/sliders/sliderControls";

import { buildDescription } from "@/lib/triw/program/buildTuneDescription";

type KeywordCard = ReturnType<typeof getKeywordCards>[number];

function buildDefaultSliderValues(): Record<SliderId, number> {
  return Object.fromEntries(
    sliderControls.map((control) => [control.id, control.defaultValue])
  ) as Record<SliderId, number>;
}

export default function ProgramPage() {
  const keywordCards = getKeywordCards();
  const keywordGroups = getKeywordCategories();

  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [error, setError] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<SliderId, number>>(
    buildDefaultSliderValues
  );
  const [talkEnabled, setTalkEnabled] = useState(true);
  const [inputMessage, setInputMessage] = useState("");

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

  function updateSlider(id: SliderId, value: number) {
    setSliderValues((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  function toggleKeyword(card: KeywordCard) {
    setInputMessage("");

    setSelectedKeywords((prev) => {
      if (prev.includes(card.id)) {
        return prev.filter((id) => id !== card.id);
      }

      const hasSameCategory = prev.some((id) => {
        const selectedCard = keywordCards.find((item) => item.id === id);
        return selectedCard?.category === card.category;
      });

      if (hasSameCategory) {
        setInputMessage("同じカテゴリのカードは1つまでです。");
        return prev;
      }

      if (prev.length >= 3) {
        setInputMessage("キーワードは最大3つまでです。");
        return prev;
      }

      return [...prev, card.id];
    });
  }

  async function createProgram() {
    setLoading(true);
    setError("");
    setResult(null);
    setEvents([]);
    setCurrentIndex(0);
    setAutoPlay(false);

    const description = buildDescription({
      keywords: selectedKeywords,
      ...sliderValues,
      talkEnabled,
    });

    try {
      const res = await fetch("/api/program/tune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "TRIW チューニング番組",
          description,
          keywords: selectedKeywords,
          ...sliderValues,
          talkEnabled,
          mode: "count",
          count: 5,
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
        const message = data?.detail || data?.error || "再生に失敗しました";
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

      <section style={{ marginTop: 24, marginBottom: 24 }}>
        <h2>Radio Tuning</h2>

        <div style={{ marginBottom: 20 }}>
          <h3>キーワード</h3>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            最大3つまで。同じカテゴリは1つまで。
          </p>

          {keywordGroups.map((group) => {
            const cards = keywordCards.filter(
              (card) => card.category === group.id
            );

            return (
              <div key={group.id} style={{ marginBottom: 16 }}>
                <h4
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                    marginBottom: 8,
                  }}
                >
                  {group.label}
                </h4>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {cards.map((card) => {
                    const selected = selectedKeywords.includes(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => toggleKeyword(card)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: "1px solid #ccc",
                          background: selected ? "#dde7ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {card.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {inputMessage && (
            <p style={{ color: "crimson", fontSize: 13 }}>{inputMessage}</p>
          )}
        </div>

        {sliderControls.map((control) => {
          const value = sliderValues[control.id] ?? control.defaultValue;

          return (
            <div key={control.id} style={{ marginBottom: 16 }}>
              <label>
                {control.label}：{getSliderText(control.id, value)}
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 4,
                  marginTop: 4,
                }}
              >
                <span>{control.leftLabel}</span>
                <span>{control.centerLabel}</span>
                <span>{control.rightLabel}</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) =>
                  updateSlider(control.id, Number(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          );
        })}

        <label>
          <input
            type="checkbox"
            checked={talkEnabled}
            onChange={(e) => setTalkEnabled(e.target.checked)}
          />{" "}
          トークを入れる
        </label>
      </section>

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
                {i + 1}.{" "}
                {e.type === "track"
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