"use client";

export type IndexTrack = { title: string; artist: string };

type Tone = "cream" | "blue" | "pink" | "slate" | "green";

const toneMap: Record<Tone, string> = {
  cream: "from-amber-50 to-amber-100",
  blue: "from-sky-50 to-blue-100",
  pink: "from-rose-50 to-pink-100",
  slate: "from-slate-50 to-slate-100",
  green: "from-emerald-50 to-emerald-100",
};

export function CassetteIndexCard({
  title,
  djName,
  sideA,
  sideB,
  tone = "cream",
}: {
  title: string;
  djName?: string;
  sideA: IndexTrack[];
  sideB: IndexTrack[];
  tone?: Tone; // ★ 追加
}) {
  const bg = toneMap[tone] || toneMap.cream;

  return (
    <section className={`mx-auto max-w-5xl rounded-2xl border p-4 shadow-sm bg-gradient-to-br ${bg}`}>
      {/* 上部メタ行 */}
      <div className="mb-3 grid grid-cols-12 items-center text-[11px] uppercase tracking-wider text-zinc-600">
        <div className="col-span-1 font-semibold">A</div>
        <div className="col-span-10 text-center">DATE/TIME • NOISE REDUCTION • SOURCE</div>
        <div className="col-span-1 text-right font-semibold">B</div>
      </div>

      {/* タイトル＆DJ */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold">{title} MIXED by {djName}</div>
      </div>

      {/* 罫線＋中央仕切り（用紙っぽく半透明ホワイトで面をつくる） */}
      <div className="relative grid grid-cols-2 gap-6 overflow-hidden rounded-xl border bg-white/85 p-4 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,theme(colors.zinc.300),theme(colors.zinc.300)_1px,transparent_1px,transparent_28px)]" />
          <div className="absolute bottom-0 top-0 left-1/2 w-px bg-zinc-200" />
        </div>

        {/* Side A */}
        <div className="relative">
          <div className="mb-1 text-xs font-medium text-zinc-500">A</div>
          <ol className="space-y-7">
            {sideA.map((t, i) => (
              <li key={i}>
                <span className="mr-2 tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}.</span>
                {t.title} <span className="text-zinc-500">/ {t.artist}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Side B */}
        <div className="relative">
          <div className="mb-1 text-right text-xs font-medium text-zinc-500">B</div>
          <ol className="space-y-7">
            {sideB.map((t, i) => (
              <li key={i}>
                <span className="mr-2 tabular-nums text-zinc-400">{String(i + 1).padStart(2, "0")}.</span>
                {t.title} <span className="text-zinc-500">/ {t.artist}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
