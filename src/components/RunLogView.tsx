// /src/components/RunLogView.tsx
"use client";

import React, { useMemo } from "react";
import { RunLogDE } from "@/components/RunLogDE";

type RunLog = {
  id?: string;
  meta?: any;
  A?: any;
  B?: any;
  C?: any;
  D?: any;
  E?: any;
  F?: any;
};

// ざっくり整形ヘルパ（見やすくするだけ）
function JsonBlock({ data }: { data: any }) {
  if (data == null) {
    return <p className="text-sm text-gray-500">（データなし）</p>;
  }
  return (
    <pre className="text-xs md:text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded border overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// C（候補）を“それっぽく”表にできそうなら表に、ダメならJSONを出す
function CSection({ C }: { C: any }) {
  // パターン1: 配列のとき（[{title, artist, arc, reason, year_guess, ...}, ...]）
  const arr = useMemo(() => (Array.isArray(C) ? (C as any[]) : null), [C]);
  // パターン2: { candidates: [...] } / { items: [...] } みたいなとき
  const cand =
    useMemo(() => {
      if (Array.isArray(C?.candidates)) return C.candidates as any[];
      if (Array.isArray(C?.items)) return C.items as any[];
      return null;
    }, [C]) ?? null;

  const rows = arr ?? cand;

  if (!rows) {
    return <JsonBlock data={C} />;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2 pr-3">#</th>
              <th className="text-left py-2 pr-3">タイトル</th>
              <th className="text-left py-2 pr-3">アーティスト</th>
              <th className="text-left py-2 pr-3">arc</th>
              <th className="text-left py-2 pr-3">予想年</th>
              <th className="text-left py-2 pr-3">理由</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-gray-500">
                  候補はありません。
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r?.title ?? i}-${i}`} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{i + 1}</td>
                  <td className="py-2 pr-3">{String(r?.title ?? "")}</td>
                  <td className="py-2 pr-3">{String(r?.artist ?? "")}</td>
                  <td className="py-2 pr-3">{String(r?.arc ?? "-")}</td>
                  <td className="py-2 pr-3">
                    {typeof r?.year_guess === "number" ? r.year_guess : r?.year ?? "-"}
                  </td>
                  <td className="py-2 pr-3">{String(r?.reason ?? "-")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* 生データも念のため折りたたまず出しておく（デバッグ用） */}
      <details className="mt-2">
        <summary className="text-sm cursor-pointer select-none">生データ（C.json）を見る</summary>
        <div className="mt-2">
          <JsonBlock data={C} />
        </div>
      </details>
    </div>
  );
}

export function RunLogView({ log }: { log: RunLog }) {
  return (
    <div className="space-y-10">
      {/* A */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">A: DJペルソナ</h2>
        <JsonBlock data={log.A} />
      </section>

      {/* B */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">B: テーマ解釈</h2>
        <JsonBlock data={log.B} />
      </section>

      {/* C */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">C: 候補曲リスト</h2>
        <CSection C={log.C} />
      </section>

      {/* 既存の D/E ビューをそのまま再利用 */}
      <RunLogDE log={log as any} />
    </div>
  );
}
