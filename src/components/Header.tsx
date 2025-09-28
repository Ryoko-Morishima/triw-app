"use client";
import { useEffect, useState } from "react";

export default function Header() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then(r => r.json())
      .then(j => setAuthed(Boolean(j.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="font-bold">TRIW MIXTAPE</div>
      {authed === null ? (
        <span className="text-sm text-gray-400">…</span>
      ) : authed ? (
        <a className="text-sm underline" href="/api/auth/logout">ログアウト</a>
      ) : (
        <a className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50" href="/api/auth/login">
          Spotifyにログイン
        </a>
      )}
    </header>
  );
}
