// --- ここから新規（BuildProgress.tsx） ---
import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_STEPS = [
  { key: "A", label: "ペルソナ生成" },
  { key: "B", label: "テーマ解釈" },
  { key: "C", label: "候補出し" },
  { key: "D", label: "Spotify解決" },
  { key: "E", label: "評価" },
  { key: "F", label: "整形" },
  { key: "G", label: "受け取りメモ作成" },
];

type Props = {
  running: boolean;
  done: boolean;
  failed?: boolean;
  // 擬似的に次の段階に進む間隔（ms）。長いときはちょい長めに。
  stepIntervalMs?: number;
  steps?: { key: string; label: string }[];
};

export default function BuildProgress({
  running,
  done,
  failed = false,
  stepIntervalMs = 1100,
  steps = DEFAULT_STEPS,
}: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!running || done || failed) return;
    const t = setInterval(() => {
      setIdx((i) => Math.min(i + 1, steps.length - 1));
    }, stepIntervalMs);
    return () => clearInterval(t);
  }, [running, done, failed, stepIntervalMs, steps.length]);

  const percent = useMemo(() => {
    if (done) return 100;
    if (failed) return 100; // 色で区別
    const base = Math.floor((idx / (steps.length - 1)) * 90); // 最後10%は完了に回す
    return Math.max(5, Math.min(95, base));
  }, [idx, steps.length, done, failed]);

  const statusText = useMemo(() => {
    if (failed) return "エラーが発生しました";
    if (done) return "完了しました";
    return `${steps[idx]?.key}: ${steps[idx]?.label} 中…`;
  }, [failed, done, idx, steps]);

  return (
    <div className="w-full rounded-xl border p-4 bg-white shadow-sm">
      <div className="mb-2 text-sm text-gray-600">{statusText}</div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            failed ? "bg-red-500" : done ? "bg-emerald-500" : "bg-gray-800"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {!done && !failed && (
        <p className="mt-2 text-xs text-gray-500">
          少々お待ちください。処理の目安を表示しています。
        </p>
      )}
    </div>
  );
}
// --- ここまで新規 ---
