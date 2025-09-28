"use client";

type Cover = { src: string; title?: string; artist?: string };

export function MixtapeSummarySheet({
  title,                 // 見出し（プレイリスト名）
  memo,                  // AIメモ
  djComment,             // 後方互換
  covers,                // カバー画像
  coverVariant = "strip", // "grid" | "strip"（横スクロール）
  /*maxCovers = 20,        // 表示最大数 */
}: {
  title: string;
  memo?: string | null;
  djComment?: string | null;
  covers: Cover[];
  coverVariant?: "grid" | "strip";
  maxCovers?: number;
}) {
  const memoDisplay = (memo ?? djComment ?? "").trim();
  const shown = Array.isArray(covers) ? covers.slice(0, maxCovers) : [];

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border bg-white p-6 shadow-sm">
      {/* 見出しはタイトルだけ */}
      <h3 className="mb-4 text-xl font-semibold">{title}</h3>

      {/* メモ本文＋（同じブロック内に）カバー画像 */}
      {memoDisplay && (
        <div className="mb-2">
          <p className="whitespace-pre-wrap text-zinc-700">{memoDisplay}</p>

          {shown.length > 0 &&
            (coverVariant === "strip" ? (
              // 横スクロールのサムネ列
              <div className="mt-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-2">
                  {shown.map((c, i) => (
                    <img
                      key={i}
                      src={c.src}
                      alt={`${c.title ?? ""} ${c.artist ? "/ " + c.artist : ""}`.trim() || "cover"}
                      className="h-16 w-16 shrink-0 rounded-md object-cover ring-1 ring-black/5 md:h-20 md:w-20"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (!el.src.endsWith("/cover-placeholder.png")) el.src = "/cover-placeholder.png";
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // グリッド（デフォルト）
              <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-8 md:gap-2">
                {shown.map((c, i) => (
                  <figure key={i} className="overflow-hidden rounded-md border bg-zinc-50">
                    <img
                      src={c.src}
                      alt={`${c.title ?? ""} ${c.artist ? "/ " + c.artist : ""}`.trim() || "cover"}
                      className="aspect-square h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (!el.src.endsWith("/cover-placeholder.png")) el.src = "/cover-placeholder.png";
                      }}
                    />
                  </figure>
                ))}
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
