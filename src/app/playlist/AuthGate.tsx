"use client";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then(r => r.json())
      .then(j => setAuthed(Boolean(j.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return <div className="flex h-40 items-center justify-center text-gray-400">認証状態を確認中…</div>;
  }
  if (!authed) {
    return (
      <div className="rounded-xl border p-6 text-center">
        <h2 className="mb-2 text-xl font-semibold">まずはSpotifyにログイン</h2>
        <p className="mb-4 text-sm text-gray-600">ミックス生成とプレイリスト保存のためにSpotify連携が必要です。</p>
        <a className="inline-block rounded-lg border px-4 py-2 font-medium hover:bg-gray-50" href="/api/auth/login">
          Spotifyにログイン
        </a>
      </div>
    );
  }
  return <>{children}</>;
}
