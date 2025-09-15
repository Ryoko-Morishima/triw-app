// /src/app/mixtape/page.tsx
"use client";

import React, { useState } from "react";
import { DJ_PRESETS } from "@/data/djs";

// 画面コンポーネント
export default function MixtapePage() {
  // ===== フォームの状態 =====
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [djId, setDjId] = useState<string>("");
  const [mode, setMode] = useState<"count" | "duration">("count");
  const [count, setCount] = useState<number>(12);
  const [duration, setDuration] = useState<number>(60);

  // Custom DJ 用
  const [customDjName, setCustomDjName] = useState("");
  const [customDjAbout, setCustomDjAbout] = useState("");

  // 進行状況
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // 成功後の情報（RunLogリンクに必要）
  const [runId, setRunId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]); // 画面で使いたければ活用

  // 任意：ログアウト（環境に合わせて実装）
  const logout = async () => {
    try {
      // プロジェクト側にlogout APIがあれば使う。無ければページリロードだけでもOK
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      location.reload();
    }
  };

  // ===== 送信処理（成功で runId を保存 → 下にリンク表示） =====
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setRunId(null);

    try {
      // Custom 選択時は名前・概要を必須に
      if (djId === "custom") {
        if (!customDjName.trim() || !customDjAbout.trim()) {
          setError("Custom DJ を選んだ場合は、DJ名と概要が必須です。");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        title,
        description,
        djId,
        mode,
        count: mode === "count" ? count : undefined,
        duration: mode === "duration" ? duration : undefined,
        customDJ:
          djId === "custom"
            ? { name: customDjName.trim(), overview: customDjAbout.trim() }
            : null,
      };

      // デバッグ用（ブラウザの開発者ツールで確認可）
      console.log("[mixtape] request payload", payload);

      const res = await fetch("/api/mixtape/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "APIエラー");
      }

      // ★ 成功時：runId を保存 → 画面下にリンク表示
      const data = await res.json();
      setRunId(data.runId || null);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setError("");

      // 必要ならここで完了フラグなど更新（例：setStatus("done")）
    } catch (err: any) {
      setError(err?.message || "不明なエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 20, display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Mixtape Maker</h1>

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
                  {dj.name || dj.shortName || dj.id}
                </option>
              ))}
          </select>
        </label>

        {/* Custom DJを選んだときだけ入力欄を出す */}
        {djId === "custom" && (
          <div style={{ display: "grid", gap: 12, border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>カスタムDJ名 *</span>
              <input
                type="text"
                value={customDjName}
                onChange={(e) => setCustomDjName(e.target.value)}
                placeholder="例：Morish"
                required
                style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>カスタムDJ概要 *</span>
              <textarea
                value={customDjAbout}
                onChange={(e) => setCustomDjAbout(e.target.value)}
                placeholder="例：夜に合う静かな選曲が得意。囁き系ボーカルが好きで..."
                required
                rows={3}
                style={{ padding: 8, border: "1px solid #ccc", borderRadius: 8 }}
              />
            </label>
          </div>
        )}

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

      {/* 成功後にだけ出るリンク */}
      {runId && (
        <div style={{ marginTop: 12 }}>
          <a
            href={`/mixtape/log/${encodeURIComponent(runId)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            詳細ログを見る（RunLog: {runId}）
          </a>
        </div>
      )}

      {/* 参考：候補を簡易表示したい場合（任意） */}
      {Array.isArray(candidates) && candidates.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary>候補（簡易表示）</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f7f7f7", padding: 8, borderRadius: 6 }}>
            {JSON.stringify(candidates, null, 2)}
          </pre>
        </details>
      )}
    </main>
  );
}
