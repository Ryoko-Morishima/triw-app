// /src/components/RunLogDE.tsx
"use client";

import React, { useMemo } from "react";

type SpotifyMatched = {
  title: string;
  artist: string;
  uri?: string | null;
  release_year?: number | null;
  album_image_url?: string | null;
  preview_url?: string | null;
  found?: boolean;
};

type EAccepted = {
  title: string;
  artist: string;
  uri?: string | null;
  duration_ms?: number | null;
  reason?: string | null;
  order?: number;
};

type ERejected = {
  title: string;
  artist: string;
  reason: string;
};

type RunLog = {
  id: string;
  D?: {
    matched?: SpotifyMatched[];
    notFound?: { title: string; artist: string }[];
  };
  E?: {
    accepted?: EAccepted[];
    rejected?: ERejected[];
    playlistUrl?: string | null;
  };
  playlistUrl?: string | null; // 後方互換
};

export function RunLogDE({ log }: { log: RunLog }) {
  const playlistUrl = log.E?.playlistUrl ?? log.playlistUrl ?? null;

  const matched = useMemo(() => log.D?.matched ?? [], [log]);
  const accepted = useMemo(
    () => (log.E?.accepted ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [log]
  );
  const rejected = useMemo(() => log.E?.rejected ?? [], [log]);

  return (
    <div className="space-y-10">
      {/* E: Playlist 概要 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">E: Playlist</h2>
        {playlistUrl ? (
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg px-4 py-2 border shadow-sm hover:shadow"
          >
            Spotifyでプレイリストを開く
          </a>
        ) : (
          <p className="text-sm text-gray-500">Playlist URL はまだありません。</p>
        )}

        {/* 採用曲 */}
        <div className="space-y-2">
          <h3 className="font-medium">採用曲</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">タイトル</th>
                  <th className="text-left py-2 pr-3">アーティスト</th>
                  <th className="text-left py-2 pr-3">URI</th>
                  <th className="text-left py-2 pr-3">長さ</th>
                  <th className="text-left py-2 pr-3">理由</th>
                </tr>
              </thead>
              <tbody>
                {accepted.length === 0 ? (
                  <tr><td colSpan={6} className="py-3 text-gray-500">採用曲はありません。</td></tr>
                ) : accepted.map((t, i) => (
                  <tr key={`${t.uri ?? t.title}-${i}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{t.order ?? i + 1}</td>
                    <td className="py-2 pr-3">{t.title}</td>
                    <td className="py-2 pr-3">{t.artist}</td>
                    <td className="py-2 pr-3">{t.uri ?? "-"}</td>
                    <td className="py-2 pr-3">{formatDuration(t.duration_ms)}</td>
                    <td className="py-2 pr-3">{t.reason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 不採用 */}
        <div className="space-y-2">
          <h3 className="font-medium">不採用（理由つき）</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 pr-3">タイトル</th>
                  <th className="text-left py-2 pr-3">アーティスト</th>
                  <th className="text-left py-2 pr-3">理由</th>
                </tr>
              </thead>
              <tbody>
                {rejected.length === 0 ? (
                  <tr><td colSpan={3} className="py-3 text-gray-500">不採用はありません。</td></tr>
                ) : rejected.map((t, i) => (
                  <tr key={`${t.title}-${i}`} className="border-b last:border-b-0">
                    <td className="py-2 pr-3">{t.title}</td>
                    <td className="py-2 pr-3">{t.artist}</td>
                    <td className="py-2 pr-3">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* D: Spotify照合結果 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">D: Spotify照合結果</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 pr-3">タイトル</th>
                <th className="text-left py-2 pr-3">アーティスト</th>
                <th className="text-left py-2 pr-3">URI</th>
                <th className="text-left py-2 pr-3">年</th>
                <th className="text-left py-2 pr-3">プレビュー</th>
                <th className="text-left py-2 pr-3">状態</th>
              </tr>
            </thead>
            <tbody>
              {matched.length === 0 ? (
                <tr><td colSpan={6} className="py-3 text-gray-500">照合結果はありません。</td></tr>
              ) : matched.map((m, i) => (
                <tr key={`${m.uri ?? m.title}-${i}`} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{m.title}</td>
                  <td className="py-2 pr-3">{m.artist}</td>
                  <td className="py-2 pr-3">{m.uri ?? "-"}</td>
                  <td className="py-2 pr-3">{m.release_year ?? "-"}</td>
                  <td className="py-2 pr-3">
                    {m.preview_url ? (
                      <audio controls src={m.preview_url} className="h-8" />
                    ) : <span className="text-gray-500">なし</span>}
                  </td>
                  <td className="py-2 pr-3">
                    {m.found ? <span className="px-2 py-1 rounded bg-green-100">found</span>
                            : <span className="px-2 py-1 rounded bg-red-100">not found</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return "-";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
