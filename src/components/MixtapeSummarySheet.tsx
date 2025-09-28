// src/components/MixtapeSummarySheet.tsx
import React from "react";

type Cover = { src: string; alt?: string };

type Props = {
  title: string;
  memo?: string;       // または djComment のどちらか
  djComment?: string;
  covers?: Cover[];    // ← undefined の可能性あり
  maxCovers?: number;  // ← 省略可能（デフォルトを持たせる）
};

export function MixtapeSummarySheet({
  title,
  memo,
  djComment,
  covers = [],           // ← デフォルト空配列
  maxCovers = 12,        // ← デフォルト値を付与
}: Props) {
  const memoDisplay = (memo ?? djComment ?? "").trim();
  const shown = Array.isArray(covers) ? covers.slice(0, Math.max(0, maxCovers)) : [];

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>

      {memoDisplay && (
        <p className="mb-4 whitespace-pre-wrap text-sm text-zinc-700">{memoDisplay}</p>
      )}

      {shown.length > 0 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {shown.map((c, i) => (
            <img
              key={i}
              src={c.src}
              alt={c.alt ?? `cover ${i + 1}`}
              className="aspect-square w-full rounded-md object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default MixtapeSummarySheet;
