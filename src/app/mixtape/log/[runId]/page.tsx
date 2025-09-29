// /src/app/mixtape/log/[runId]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { RunLogView } from "@/components/RunLogView";
import { getRunLogById } from "@/lib/runlog";

type Params = { runId: string };
type Props = { params: Promise<Params> }; // ★ Next.jsの新仕様：paramsはPromise

export default async function RunLogPage({ params }: Props) {
  const { runId } = await params; // ★ ここでawaitが必須
  const log = await getRunLogById(runId); // { meta, A, B, C, D, E, F }

  if (!log) return notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RunLog #{runId}</h1>
        <Link href="/mixtape" className="underline">
          ← 戻る
        </Link>
      </header>

      {/* A〜E の統合ビュー（既存） */}
      <RunLogView log={log as any} />
    </main>
  );
}
