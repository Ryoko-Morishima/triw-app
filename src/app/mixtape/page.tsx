// src/app/mixtape/page.tsx
"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { DJ_PRESETS } from "@/data/djs";

type Status = { loggedIn: boolean; expiresAt: number | null };

type Candidate = {
  title: string;
  artist: string;
  album?: string | null;
  arc: "intro" | "build" | "peak" | "cooldown" | "other";
  reason: string;
  whyPersonaFit: string;
  whyThemeFit: string;
  year_guess?: number | null;
};

export default function MixtapeHome() {
  const [s, setS] = useState<Status | null>(null);
  const started = useRef(false);

  // 入力
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [djId, setDjId] = useState("");
  const [mode, setMode] = useState<"count" | "duration">("count");
  const [count, setCount] = useState(7);
  const [duration, setDuration] = useState(30);

  // 進行状況
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 結果（候補）
  const [runId, setRunId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  // プレイリスト作成結果
  const [creating, setCreating] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  async function fetchStatus() {
    const r = await fetch("/api/auth/status", {
      cache: "no-store",
      credentials: "include",
    });
    const j = (await r.json()) as Status;
    setS(j);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchStatus();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    location.reload();
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setRunId(null);
    setCandidates(null);
    setPlaylistUrl(null);
    setPlaylistError(null);

    if (!title.trim() || !description.trim() || !djId.trim()) {
      setError("番組タイトル／概要／DJ は必須です。");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        mode === "count"
          ? { title, description, djId, mode, count }
          : { title, description, djId, mode, duration };

      const res = await fetch("/api/mixtape/plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `API error: ${res.status}`);
        return;
      }

      const gotRunId = (json?.runId as string) || null;
      const gotList = Array.isArray(json?.candidates) ? (json.candidates as Candidate[]) : [];

      setRunId(gotRunId);
      setCandidates(gotList);
    } catch (err: any) {
      setError(err?.message || "送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  // 目標7曲（mode=duration のときはだいたい4分/曲として概算）
  function targetCount(): number {
    if (mode === "count") return Math.max(1, Math.min(50, count || 7));
    const est = Math.round(Math.max(10, duration || 30) / 4);
    return Math.max(3, Math.min(50, est));
  }

  async function createPlaylistFromCandidates() {
    if (!candidates || candidates.length === 0) return;
    setCreating(true);
    setPlaylistUrl(null);
    setPlaylistError(null);

    try {
      const res = await fetch("/api/mixtape/playlist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          djId,
          targetCount: targetCount(),
          candidates,
          runId, // 任意：サーバ側でログに紐づけるときに使える
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setPlaylistError(json?.error || `Playlist API error: ${res.status}`);
        return;
      }
      setPlaylistUrl(json.playlistUrl || null);
    } catch (err: any) {
      setPlaylistError(err?.message || "プレイリスト作成に失敗しました。");
    } finally {
      setCreating(false);
    }
  }

  if (!s) return <main style={{ padding: 24 }}>Loading…</main>;

  // 未ログイン時：既存の導線を維持
  if (!s.loggedIn) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 12 }}>
          TRIW Minimal: Mixtape
        </h1>
        <p style={{ marginBottom: 16 }}>未ログインです。</p>
        <a href="/login">Login Pageへ</a>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 920 }}>
      <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
        TRIW: 候補（仮）の下書きを作る
      </h1>
      <p style={{ marginBottom: 12, color: "#666" }}>
        Expires: {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "-"}
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>番組タイトル *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例）夜更けのUKインディ・ドリーム"
            required
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>番組概要 *</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例）90s〜現行まで、靄のかかったギターと囁きボーカルで..."
            required
            rows={4}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>DJ *</span>
          <select
            value={djId}
            onChange={(e) => setDjId(e.target.value)}
            required
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="" disabled>
              選択してください
            </option>
            {Array.isArray(DJ_PRESETS) &&
              DJ_PRESETS.map((dj) => (
                <option key={dj.id} value={dj.id}>
                  {dj.name || dj.displayName || dj.title || dj.id}
                </option>
              ))}
          </select>
        </label>

        <fieldset style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <legend style={{ fontWeight: 600, marginBottom: 6 }}>目標</legend>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="radio"
              name="mode"
              value="count"
              checked={mode === "count"}
              onChange={() => setMode("count")}
            />
            曲数
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={mode !== "count"}
            style={{ width: 100, padding: 6, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="radio"
              name="mode"
              value="duration"
              checked={mode === "duration"}
              onChange={() => setMode("duration")}
            />
            分数
          </label>
          <input
            type="number"
            min={5}
            max={300}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={mode !== "duration"}
            style={{ width: 100, padding: 6, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </fieldset>

        {error && (
          <p style={{ color: "crimson", fontWeight: 600 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #222",
              background: submitting ? "#eee" : "#fff",
            }}
          >
            {submitting ? "生成中…" : "候補の下書きを作る"}
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </form>

      {/* 生成後の結果表示 */}
      {candidates && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            候補（仮）
          </h2>
          <ol style={{ display: "grid", gap: 12, paddingLeft: 20 }}>
            {candidates.map((c, i) => (
              <li key={`${c.title}-${c.artist}-${i}`}>
                <div style={{ fontWeight: 600 }}>
                  {c.title} — {c.artist}
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  arc: {c.arc}
                  {c.year_guess ? ` / year? ${c.year_guess}` : ""}
                  {c.album ? ` / album: ${c.album}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#333" }}>理由: {c.reason}</div>
                <div style={{ fontSize: 12, color: "#333" }}>
                  DJ適合: {c.whyPersonaFit}
                </div>
                <div style={{ fontSize: 12, color: "#333" }}>
                  テーマ適合: {c.whyThemeFit}
                </div>
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={createPlaylistFromCandidates}
              disabled={creating}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #0a5",
                background: creating ? "#eafff3" : "#fff",
              }}
            >
              {creating ? "Spotifyに作成中…" : `この候補からプレイリスト作成（${targetCount()}曲）`}
            </button>

            {playlistUrl && (
              <a
                href={playlistUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "underline" }}
              >
                作成したプレイリストを開く
              </a>
            )}
          </div>

          {playlistError && (
            <p style={{ color: "crimson", fontWeight: 600, marginTop: 8 }}>
              {playlistError}
            </p>
          )}

          {runId && !playlistUrl && (
            <div style={{ marginTop: 12 }}>
              <a
                href={`/mixtape/log/${encodeURIComponent(runId)}`}
                style={{ textDecoration: "underline" }}
              >
                詳細ログを見る
              </a>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
