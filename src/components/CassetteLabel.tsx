"use client";

export type CassetteTrack = { title: string; artist: string; uri?: string | null };

export function CassetteLabel({
  title,
  djName,
  comment,
  tracks,
}: {
  title: string;
  djName?: string;
  comment?: string;
  tracks: CassetteTrack[];
}) {
  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-[24px] border bg-gradient-to-br from-zinc-100 to-zinc-200 p-5 shadow-sm">
      {/* テープ窓 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-16 w-16 rounded-full border-4 border-zinc-700 bg-zinc-300 shadow-inner" />
        <div className="mx-3 h-10 flex-1 rounded-md bg-zinc-800/80" />
        <div className="h-16 w-16 rounded-full border-4 border-zinc-700 bg-zinc-300 shadow-inner" />
      </div>

      {/* ラベル面 */}
      <div className="rounded-xl bg-white p-4 shadow-inner">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
          {djName && <div className="text-xs text-zinc-500">DJ: {djName}</div>}
        </div>

        {comment && (
          <p className="mb-3 text-sm text-zinc-700">
            {comment}
          </p>
        )}

        <ol className="space-y-1 text-sm">
          {tracks.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-6 tabular-nums text-zinc-500">{String(i + 1).padStart(2, "0")}.</span>
              <span className="flex-1">
                {t.title} <span className="text-zinc-500">/ {t.artist}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
