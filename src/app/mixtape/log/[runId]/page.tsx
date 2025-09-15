// /src/app/mixtape/log/[runId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { RunLogDE, RunLogView } from "@/components/RunLogView";
import { getRunLogById } from "@/lib/runlog"; // 既存の取得関数を想定

type Props = { params: { runId: string } };

export default async function RunLogPage({ params }: Props) {
  const runId = params.runId;
  const log = await getRunLogById(runId); // { id, createdAt, A, B, C, D, E, F, playlistUrl? ... }

  if (!log) return notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RunLog #{runId}</h1>
        <Link href="/mixtape" className="underline">← 戻る</Link>
      </header>

      {/* A〜E の統合ビュー */}
      <RunLogView log={log} />
    </main>
  );
}
