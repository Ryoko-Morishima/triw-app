"use client";

import { useState, useRef } from "react";

type Mode = "count" | "duration";

export default function FinalizeTesterPage() {
  const [pickedJson, setPickedJson] = useState<string>("");
  const [title, setTitle] = useState<string>("はじめてのビートルズ");
  const [overview, setOverview] = useState<string>("ビートルズを初めて聴く人におすすめの名曲特集");
  const [mode, setMode] = useState<Mode>("count");
  const [k, setK] = useState<number>(12);
  const [mins, setMins] = useState<number>(30);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // E.json をアップロードして picked を自動抽出
  const onUploadEJson = async (file: File) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const picked = Array.isArray(obj?.picked) ? obj.picked : obj;
      setPickedJson(JSON.stringify(picked, null, 2));
      setError("");
    } catch (e: any) {
      setError("E.json の読み込みに失敗しました: " + e?.message);
    }
  };

  const run = async () => {
    setError("");
    setResult(null);
    let picked: any[] = [];
    try {
      const parsed = JSON.parse(pickedJson || "[]");
      picked = Array.isArray(parsed) ? parsed : [];
      if (!picked.length) throw new Error("picked が空です。");
    } catch (e: any) {
      setError("picked（JSON配列）を確認してください: " + e?.message);
      return;
    }

    const payload: any = {
      picked,
      title,
      overview,
      mode,
    };
    if (mode === "count") payload.maxTracks = k;
    else payload.targetDurationMin = mins;

    try {
      const res = await fetch("/api/mixtape/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "API error");
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError("通信エラー: " + e?.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Finalize Tester（E → F）</h1>

      {/* 使い方 */}
      <div className="p-4 rounded-xl border">
        <ol className="list-decimal ml-5 space-y-1 text-sm">
          <li>E.json を選ぶ（または下のテキストに <code>picked</code> の配列を貼る）</li>
          <li>番組タイトルと概要を入れる（特集っぽいと自動で被り無制限になります）</li>
          <li>曲数 or 分数を選んで「実行」を押す</li>
        </ol>
      </div>

      {/* 入力：E.json アップロード */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadEJson(f);
          }}
        />
        <button
          className="px-3 py-2 rounded-xl border"
          onClick={() => {
            fileRef.current?.value && (fileRef.current.value = "");
            setPickedJson("");
          }}
        >
          クリア
        </button>
      </div>

      {/* 入力：picked 配列 */}
      <div>
        <label className="block text-sm font-medium mb-1">picked（E.json の picked 配列を貼る）</label>
        <textarea
          value={pickedJson}
          onChange={(e) => setPickedJson(e.target.value)}
          placeholder='[{"title":"Plastic Love","artist":"Mariya Takeuchi","uri":"spotify:track:...","confidence":0.65,"reason":"実在OK / 表記=exact / 年OFF","accepted":true}]'
          className="w-full h-56 p-3 rounded-xl border font-mono text-xs"
        />
      </div>

      {/* 入力：番組文脈 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">番組タイトル</label>
          <input
            className="w-full p-2 rounded-xl border"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="はじめての◯◯ / Best of ..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">概要</label>
          <input
            className="w-full p-2 rounded-xl border"
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            placeholder="特集の説明やテーマなど"
          />
        </div>
      </div>

      {/* 入力：モード選択 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === "count"}
            onChange={() => setMode("count")}
          />
          <span>曲数で指定</span>
        </label>
        <input
          type="number"
          className="w-24 p-2 rounded-xl border"
          disabled={mode !== "count"}
          value={k}
          onChange={(e) => setK(Number(e.target.value || 0))}
          min={1}
        />
        <label className="flex items-center gap-2 ml-6">
          <input
            type="radio"
            checked={mode === "duration"}
            onChange={() => setMode("duration")}
          />
          <span>分数で指定</span>
        </label>
        <input
          type="number"
          className="w-24 p-2 rounded-xl border"
          disabled={mode !== "duration"}
          value={mins}
          onChange={(e) => setMins(Number(e.target.value || 0))}
          min={1}
        />
      </div>

      {/* 実行 */}
      <button
        onClick={run}
        className="px-4 py-2 rounded-xl border shadow"
      >
        実行
      </button>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 rounded-xl border border-red-400 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-3">
          <div className="text-sm">
            <div>tracks: <b>{result.tracks?.length ?? 0}</b></div>
            <div>duration(min): <b>{((result.program_duration_ms ?? 0) / 60000).toFixed(1)}</b></div>
            <div>artist_policy_effective: <b>{result.stats?.artist_policy_effective}</b></div>
            {result.stats?.focus_artist_auto && (
              <div>auto focus artist: <b>{result.stats.focus_artist_auto}</b></div>
            )}
            {result.stats?.focus_reason && (
              <div className="text-gray-600">reason: {result.stats.focus_reason}</div>
            )}
          </div>
          <pre className="p-3 rounded-xl border bg-white overflow-auto text-xs">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
