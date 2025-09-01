// src/app/mixtape/thinking/page.tsx
"use client";

import { useEffect, useState } from "react";

type LogEntry = { at: string; phase: string; message: string; data?: any };

export default function ThinkingPage() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const runId = sp.get("runId");
    if (!runId) { setErr("runId がありません"); return; }
    (async () => {
      try {
        const r = await fetch(`/api/mixtape/log?runId=${encodeURIComponent(runId)}`, { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "API error");
        setLogs(j.logs || []);
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">思考過程（生成ログ）</h1>
      {err && <p className="text-red-600">{err}</p>}
      {!logs && !err && <p>読み込み中…</p>}
      {logs && (
        <ul className="space-y-2">
          {logs.map((l, i) => (
            <li key={i} className="p-3 rounded border">
              <div className="text-xs text-gray-500">{new Date(l.at).toLocaleString()}</div>
              <div className="font-mono text-sm">{l.phase}: {l.message}</div>
              {l.data && (
                <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded mt-1">
                  {typeof l.data === "string" ? l.data : JSON.stringify(l.data, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
