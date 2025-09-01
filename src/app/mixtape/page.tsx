"use client";

import { FormEvent, useMemo, useState } from "react";

// djs.ts の export 形に柔軟対応
import * as DJs from "@/data/djs";
const DJ_LIST: any[] = Array.isArray((DJs as any).DJ_PROFILES)
  ? (DJs as any).DJ_PROFILES
  : Array.isArray((DJs as any).DJ_PRESETS)
    ? (DJs as any).DJ_PRESETS
    : Array.isArray((DJs as any).default)
      ? (DJs as any).default
      : [];

type Arc = "intro" | "build" | "peak" | "cooldown" | "other";

type Candidate = {
  title: string;
  artist: string;
  album?: string | null;
  arc: Arc;
  reason: string;
  whyPersonaFit: string;
  whyThemeFit: string;
  year_guess?: number | null;
};

type ApiResponse = {
  runId: string;
  djId: string;
  candidates: Candidate[];
};

export default function MixtapePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [djId, setDjId] = useState("");
  const [mode, setMode] = useState<"count" | "duration">("count");
  const [count, setCount] = useState(7);
  const [duration, setDuration] = useState(30);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiResponse | null>(null);

  const djs = useMemo(() => DJ_LIST, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const r = await fetch("/api/mixtape/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, djId, mode, count, duration }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "API error");
      setResp(j as ApiResponse);
    } catch (err: any) {
      setError(err?.message || "unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Mixtape – Phase 1 (A→B→C)</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">番組タイトル</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例）夜ドライブ：静かな始まりから盛り上げる"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">番組概要</label>
          <textarea
            className="mt-1 w-full border rounded p-2 min-h-[96px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ムード・年代・地域などのヒントをざっくり"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">DJを選択</label>
          <select
            className="mt-1 w-full border rounded p-2"
            value={djId}
            onChange={(e) => setDjId(e.target.value)}
            required
          >
            <option value="" disabled>
              選んでください
            </option>
            {djs.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name || d.displayName || d.title || d.shortName || d.id}
              </option>
            ))}
          </select>
          {djs.length === 0 && (
            <p className="text-red-600 text-sm mt-1">
              DJリストが空です。src/data/djs.ts の export 形（DJ_PRESETS or DJ_PROFILES / named or default）を確認してください。
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === "count"} onChange={() => setMode("count")} />
            曲数指定
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === "duration"} onChange={() => setMode("duration")} />
            分数指定
          </label>
        </div>

        {mode === "count" ? (
          <div>
            <label className="block text-sm font-medium">曲数</label>
            <input
              type="number"
              min={1}
              className="mt-1 w-28 border rounded p-2"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">分数</label>
            <input
              type="number"
              min={5}
              className="mt-1 w-28 border rounded p-2"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value || "0", 10))}
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
          {loading ? "生成中…" : "候補曲を生成"}
        </button>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {resp && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">runId: {resp.runId}</div>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 text-left">#</th>
                  <th className="border px-2 py-1 text-left">Title</th>
                  <th className="border px-2 py-1 text-left">Artist</th>
                  <th className="border px-2 py-1 text-left">Arc</th>
                  <th className="border px-2 py-1 text-left">Year?</th>
                  <th className="border px-2 py-1 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {resp.candidates.map((c, i) => (
                  <tr key={`${c.title}-${c.artist}-${i}`}>
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1">{c.title}</td>
                    <td className="border px-2 py-1">{c.artist}</td>
                    <td className="border px-2 py-1">{c.arc}</td>
                    <td className="border px-2 py-1">{c.year_guess ?? "-"}</td>
                    <td className="border px-2 py-1">
                      <div className="whitespace-pre-wrap">{c.reason}</div>
                      <div className="text-gray-500">PFit: {c.whyPersonaFit}</div>
                      <div className="text-gray-500">TFit: {c.whyThemeFit}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
