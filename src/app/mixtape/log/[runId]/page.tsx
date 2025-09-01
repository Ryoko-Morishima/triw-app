// src/app/mixtape/log/[runId]/page.tsx
export const runtime = "nodejs"; // FSを使うのでNode実行に固定

import { readRun } from "@/lib/runlog";
import Link from "next/link";

type SectionProps = { title: string; data: unknown };
function Section({ title, data }: SectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold mt-6">{title}</h2>
      <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded border text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}

// ★ Next.js 15+ では params は Promise。await してから取り出す
export default async function RunLogPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params; // ← ここがポイント
  const { meta, A, B, C } = await readRun(runId);

  if (!meta) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Run Log</h1>
        <p className="text-red-600">ログが見つかりませんでした（runId: {runId}）。</p>
        <Link className="underline" href="/mixtape">
          ← 戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Run Log: {runId}</h1>
      <div className="text-sm text-gray-600 mb-4">
        <Link className="underline" href="/mixtape">
          ← Mixtapeに戻る
        </Link>
      </div>

      <Section title="Meta" data={meta} />
      <Section title="A: DJペルソナ" data={A} />
      <Section title="B: 番組テーマ解釈（DJ本人）" data={B} />
      <Section title="C: 候補曲（DJ本人）" data={C} />

      {/* D/E/F は今後ここに追記予定 */}
    </div>
  );
}
