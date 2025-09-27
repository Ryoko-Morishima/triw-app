"use client";

import { useMemo, useState } from "react";
import Balancer from "react-wrap-balancer";
import { DJCard } from "@/components/DJCard";
import { SaveToSpotifyButton } from "@/components/SaveToSpotifyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

const DJ_PRESETS = [
  { id: "mellow", name: "DJ Mellow", desc: "夜更けにそっと寄り添うチル担当", image: "/dj/mellow.png" },
  { id: "groove", name: "DJ Groove", desc: "ダンサブルでハッピー", image: "/dj/groove.png" },
  { id: "classic", name: "DJ Classic", desc: "黄金期の名曲案内人", image: "/dj/classic.png" },
];

type PlanResponse = {
  runId: string; djId: string; title: string; description: string;
  mode: "count" | "duration"; count?: number; duration?: number;
  fallback?: boolean; E?: { picked: any[]; rejected: any[] }; F?: any; error?: string;
};

function collectUris(F: any, E: any): string[] {
  const fromF = (F?.tracks ?? F?.items ?? F?.setlist ?? [])
    .map((t: any) => t?.uri || t?.spotify?.uri).filter(Boolean);
  if (fromF.length) return fromF;
  const fromE = (E?.picked ?? [])
    .map((t: any) => t?.uri || t?.spotify?.uri).filter(Boolean);
  return fromE;
}

export default function Page() {
  const [djId, setDjId] = useState(DJ_PRESETS[0].id);
  const [title, setTitle] = useState("あなたの朝に寄り添う90sプレイリスト");
  const [desc, setDesc] = useState("90年代の空気感で、静かに立ち上がっていく選曲にします。");
  const [mode, setMode] = useState<"count" | "duration">("count");
  const [count, setCount] = useState(10);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);

  const uris = useMemo(() => collectUris(plan?.F, plan?.E), [plan]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const body: any = { title, description: desc, djId, mode, ...(mode === "count" ? { count } : { duration }) };
      const res = await fetch("/api/mixtape/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as PlanResponse;
      if (!res.ok) throw new Error(json?.error || "failed");
      setPlan(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          <Balancer>DJが選ぶ、あなただけのプレイリスト</Balancer>
        </h1>
        <p className="text-gray-600 mt-2"><Balancer>好きなDJを選んで、テーマを入れるだけ。年代指定（90s/平成）もOK。</Balancer></p>
      </div>

      {/* DJ 選択 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. DJを選ぶ</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {DJ_PRESETS.map((dj) => (
            <DJCard key={dj.id} {...dj} active={djId === dj.id} onClick={() => setDjId(dj.id)} />
          ))}
          <div
            className={`rounded-2xl border border-dashed p-4 grid place-items-center cursor-pointer ${djId === "custom" ? "border-black" : "border-gray-200"}`}
            onClick={() => setDjId("custom")}
          >
            <div className="text-sm text-gray-500">＋ カスタムDJ（後で対応）</div>
          </div>
        </div>
      </section>

      {/* 入力 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. プレイリスト情報</h2>
        <div className="grid gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="プレイリスト名" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="どんな気分/シーン？（90s/平成/深夜など書くと年代ゲートが効くよ）" />
        </div>
      </section>

      {/* 曲数 or 分数 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. 曲数 or 分数</h2>
        <div className="flex items-center gap-3">
          <Button variant={mode === "count" ? "default" : "outline"} onClick={() => setMode("count")}>曲数で指定</Button>
          <Button variant={mode === "duration" ? "default" : "outline"} onClick={() => setMode("duration")}>分数で指定</Button>
          {mode === "count" ? (
            <Input type="number" min={3} max={30} className="w-28" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          ) : (
            <div className="flex items-center gap-2">
              <Input type="number" min={10} max={120} className="w-28" value={duration}
                     onChange={(e) => setDuration(Number(e.target.value))} />
              <span className="text-sm text-gray-600">分</span>
            </div>
          )}
        </div>
      </section>

      {/* 生成 & 保存 */}
      <div className="flex items-center gap-3">
        <Button onClick={handleGenerate} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? "生成中..." : "プレイリストを生成"}
        </Button>
        {uris.length > 0 && (
          <SaveToSpotifyButton
            uris={uris}
            name={`TRIW - ${plan?.title ?? "Untitled"}`}
            description={plan?.description ?? ""}
          />
        )}
      </div>

      {/* 結果（簡易） */}
      {plan?.E?.picked?.length ? (
        <div className="mt-8">
          <h3 className="font-medium mb-2">採用曲</h3>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">曲名</th>
                  <th className="p-2 text-left">アーティスト</th>
                  <th className="p-2 text-left">Confidence</th>
                  <th className="p-2 text-left">理由</th>
                </tr>
              </thead>
              <tbody>
                {plan.E.picked.map((p: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{p.title}</td>
                    <td className="p-2">{p.artist}</td>
                    <td className="p-2 tabular-nums">{typeof p.confidence === "number" ? p.confidence.toFixed(2) : "-"}</td>
                    <td className="p-2 text-gray-600">{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </main>
  );
}
